import { isTimeoutError } from "../common/utils/is-timeout-error.util";
import * as igdbServiceError from "./errors/igdb.service-error";
import {
	GAME_FIELDS,
	IGDB_GAMES_URL,
	IGDB_REQUEST_TIMEOUT_MS,
	MAIN_GAME_TYPE_ID
} from "./igdb.constants";
import { type IgdbGame, type IgdbSearchOptions } from "./igdb.interface";
import { IgdbTokenClient } from "./igdb-token.client";
import { escapeApicalypseString } from "./utils/escape-apicalypse-string.util";
import { normalizeSearchLimit } from "./utils/normalize-search-limit.util";

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
		),
		private readonly requestTimeoutMs = IGDB_REQUEST_TIMEOUT_MS
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
		clauses.push(`limit ${normalizeSearchLimit(options.limit)};`);

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
				body,
				signal: AbortSignal.timeout(this.requestTimeoutMs)
			});
		} catch (error) {
			if (isTimeoutError(error)) throw this.timeoutError();
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
			if (isTimeoutError(error)) throw this.timeoutError();
			throw igdbServiceError.parseError(error);
		}

		if (!Array.isArray(body))
			throw igdbServiceError.parseError(
				"IGDB response body is not an array"
			);
		return body as IgdbGame[];
	}

	private timeoutError() {
		return igdbServiceError.requestError(
			`IGDB request timed out after ${this.requestTimeoutMs} ms`
		);
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
