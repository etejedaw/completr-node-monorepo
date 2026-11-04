import * as igdbServiceError from "./errors/igdb.service-error";
import { type IgdbGame, type IgdbSearchOptions } from "./igdb.interface";
import { IgdbTokenClient } from "./igdb-token.client";

const IGDB_GAMES_URL = "https://api.igdb.com/v4/games";
const DEFAULT_SEARCH_LIMIT = 10;
const MAX_SEARCH_LIMIT = 500;
const MAIN_GAME_TYPE_ID = 0;
const GAME_FIELDS = [
	"id",
	"name",
	"slug",
	"summary",
	"first_release_date",
	"rating",
	"rating_count",
	"url",
	"game_type.id",
	"game_type.type",
	"cover.id",
	"cover.image_id",
	"platforms.id",
	"platforms.slug",
	"genres.id",
	"genres.slug",
	"themes.id",
	"themes.slug"
].join(",");

export abstract class IgdbClient {
	abstract readonly isEnabled: boolean;

	static create(clientId?: string, clientSecret?: string): IgdbClient {
		if (!clientId || !clientSecret) return new DisabledIgdbProvider();
		return new IgdbProvider(clientId, clientSecret);
	}

	abstract searchGame(
		query: string,
		options?: IgdbSearchOptions
	): Promise<IgdbGame[]>;

	abstract getGameById(id: number): Promise<IgdbGame>;

	abstract getGameBySlug(slug: string): Promise<IgdbGame>;
}

export class IgdbProvider extends IgdbClient {
	readonly isEnabled = true;

	constructor(
		private readonly clientId: string,
		clientSecret: string,
		private readonly tokenClient = new IgdbTokenClient(
			clientId,
			clientSecret
		)
	) {
		super();
	}

	async searchGame(
		query: string,
		options: IgdbSearchOptions = {}
	): Promise<IgdbGame[]> {
		if (!query.trim()) return [];

		const clauses = [
			`search "${escapeApicalypseString(query)}";`,
			`fields ${GAME_FIELDS};`
		];
		if (options.mainGamesOnly)
			clauses.push(`where game_type = ${MAIN_GAME_TYPE_ID};`);
		clauses.push(`limit ${normalizeLimit(options.limit)};`);

		return await this.request(clauses.join(" "));
	}

	async getGameById(id: number): Promise<IgdbGame> {
		if (!Number.isSafeInteger(id) || id <= 0)
			throw igdbServiceError.notFoundError();

		return await this.requestSingle(`where id = ${id};`);
	}

	async getGameBySlug(slug: string): Promise<IgdbGame> {
		if (!slug.trim()) throw igdbServiceError.notFoundError();

		return await this.requestSingle(
			`where slug = "${escapeApicalypseString(slug)}";`
		);
	}

	private async requestSingle(whereClause: string): Promise<IgdbGame> {
		const [game] = await this.request(
			`fields ${GAME_FIELDS}; ${whereClause} limit 1;`
		);
		if (!game) throw igdbServiceError.notFoundError();
		return game;
	}

	private async request(body: string): Promise<IgdbGame[]> {
		const response = await this.sendWithFreshToken(body);
		this.handleErrors(response);
		return await this.parseGames(response);
	}

	private async sendWithFreshToken(body: string): Promise<Response> {
		const token = await this.tokenClient.getToken();
		const response = await this.fetchIgdb(body, token);
		if (response.status !== 401) return response;

		this.tokenClient.invalidate(token);
		const renewedToken = await this.tokenClient.getToken();
		const retried = await this.fetchIgdb(body, renewedToken);
		if (retried.status === 401)
			throw igdbServiceError.authError(
				"IGDB rejected the access token after renewing it"
			);
		return retried;
	}

	private async fetchIgdb(body: string, token: string): Promise<Response> {
		try {
			return await fetch(IGDB_GAMES_URL, {
				method: "POST",
				headers: {
					"Client-ID": this.clientId,
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				},
				body
			});
		} catch (error) {
			const reason = error instanceof Error ? error.message : "unknown";
			throw igdbServiceError.requestError(
				`IGDB request failed before a response: ${reason}`
			);
		}
	}

	private handleErrors(response: Response): void {
		if (response.status === 429) throw igdbServiceError.rateLimitedError();
		if (!response.ok)
			throw igdbServiceError.requestError(
				`IGDB API returned ${response.status}: ${response.statusText}`
			);
	}

	private async parseGames(response: Response): Promise<IgdbGame[]> {
		let body: unknown;
		try {
			body = await response.json();
		} catch (error) {
			throw igdbServiceError.parseError(error);
		}

		if (!Array.isArray(body))
			throw igdbServiceError.parseError(
				"IGDB response body is not an array"
			);
		return body as IgdbGame[];
	}
}

export class DisabledIgdbProvider extends IgdbClient {
	readonly isEnabled = false;

	searchGame(): Promise<IgdbGame[]> {
		return Promise.reject(igdbServiceError.disabledError());
	}

	getGameById(): Promise<IgdbGame> {
		return Promise.reject(igdbServiceError.disabledError());
	}

	getGameBySlug(): Promise<IgdbGame> {
		return Promise.reject(igdbServiceError.disabledError());
	}
}

function escapeApicalypseString(value: string): string {
	return value.replace(/[\\"]/g, character => `\\${character}`);
}

function normalizeLimit(limit: number | undefined): number {
	if (limit === undefined || !Number.isInteger(limit) || limit <= 0)
		return DEFAULT_SEARCH_LIMIT;
	return Math.min(limit, MAX_SEARCH_LIMIT);
}
