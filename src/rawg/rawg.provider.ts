import * as rawgServiceError from "./errors/rawg.service-error";
import {
	type RawgGameDetail,
	type RawgGameSearchResult,
	type RawgSearchFilters
} from "./rawg.interface";

export abstract class RawgClient {
	abstract readonly isEnabled: boolean;

	static create(apiKey?: string): RawgClient {
		if (!apiKey) return new DisabledRawgProvider();
		return new RawgProvider(apiKey);
	}

	abstract searchGame(
		query: string,
		filters?: RawgSearchFilters
	): Promise<RawgGameSearchResult[]>;

	abstract getGameById(id: number): Promise<RawgGameDetail>;

	abstract getGameBySlug(slug: string): Promise<RawgGameDetail>;
}

export class RawgProvider extends RawgClient {
	readonly isEnabled = true;

	private readonly BASE_URL = "https://api.rawg.io/api";

	constructor(private readonly apiKey: string) {
		super();
	}

	async searchGame(
		query: string,
		filters: RawgSearchFilters = {}
	): Promise<RawgGameSearchResult[]> {
		const url = new URL(`${this.BASE_URL}/games`);
		url.searchParams.set("key", this.apiKey);
		url.searchParams.set("search", query);
		url.searchParams.set("search_precise", "true");

		const { page_size = 5, ...rest } = filters;
		url.searchParams.set("page_size", page_size.toString());

		for (const [key, value] of Object.entries(rest)) {
			if (value !== undefined)
				url.searchParams.set(key, value.toString());
		}

		const response = await fetch(url.toString());
		this.handleErrors(response);

		const data = await response.json();
		return data.results;
	}

	async getGameById(id: number): Promise<RawgGameDetail> {
		const url = new URL(`${this.BASE_URL}/games/${id}`);
		url.searchParams.set("key", this.apiKey);

		const response = await fetch(url.toString());
		this.handleErrors(response);

		return await response.json();
	}

	async getGameBySlug(slug: string): Promise<RawgGameDetail> {
		const url = new URL(`${this.BASE_URL}/games/${slug}`);
		url.searchParams.set("key", this.apiKey);

		const response = await fetch(url.toString());
		this.handleErrors(response);

		return await response.json();
	}

	private handleErrors(response: Response): void {
		if (response.status === 429) throw rawgServiceError.rateLimitedError();
		if (response.status === 404) throw rawgServiceError.notFoundError();
		if (!response.ok)
			throw rawgServiceError.requestError(
				`RAWG API returned ${response.status}: ${response.statusText}`
			);
	}
}

export class DisabledRawgProvider extends RawgClient {
	readonly isEnabled = false;

	searchGame(): Promise<RawgGameSearchResult[]> {
		throw rawgServiceError.disabledError();
	}

	getGameById(): Promise<RawgGameDetail> {
		throw rawgServiceError.disabledError();
	}

	getGameBySlug(): Promise<RawgGameDetail> {
		throw rawgServiceError.disabledError();
	}
}
