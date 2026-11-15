import { isTimeoutError } from "../common/utils/is-timeout-error.util";
import * as rawgServiceError from "./errors/rawg.service-error";
import {
	DEFAULT_SEARCH_PAGE_SIZE,
	RAWG_BASE_URL,
	RAWG_REQUEST_TIMEOUT_MS,
	RAWG_SLUG_PATTERN
} from "./rawg.constants";
import {
	type RawgGameDetail,
	type RawgGameSearchResult,
	type RawgSearchFilters,
	type RawgSearchResponse
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

	constructor(
		private readonly apiKey: string,
		private readonly requestTimeoutMs = RAWG_REQUEST_TIMEOUT_MS
	) {
		super();
	}

	async searchGame(
		query: string,
		filters: RawgSearchFilters = {}
	): Promise<RawgGameSearchResult[]> {
		const url = new URL(`${RAWG_BASE_URL}/games`);
		url.searchParams.set("key", this.apiKey);
		url.searchParams.set("search", query);
		url.searchParams.set("search_precise", "true");

		const { page_size = DEFAULT_SEARCH_PAGE_SIZE, ...rest } = filters;
		url.searchParams.set("page_size", page_size.toString());

		for (const [key, value] of Object.entries(rest)) {
			if (value !== undefined)
				url.searchParams.set(key, value.toString());
		}

		const data = await this.request<RawgSearchResponse>(url);
		if (!Array.isArray(data?.results))
			throw rawgServiceError.parseError(
				"RAWG search response without results"
			);
		return data.results;
	}

	async getGameById(id: number): Promise<RawgGameDetail> {
		if (!Number.isSafeInteger(id) || id <= 0)
			throw rawgServiceError.notFoundError();

		const url = new URL(`${RAWG_BASE_URL}/games/${id}`);
		url.searchParams.set("key", this.apiKey);

		return await this.request<RawgGameDetail>(url);
	}

	async getGameBySlug(slug: string): Promise<RawgGameDetail> {
		if (!RAWG_SLUG_PATTERN.test(slug))
			throw rawgServiceError.notFoundError();

		const url = new URL(`${RAWG_BASE_URL}/games/${slug}`);
		url.searchParams.set("key", this.apiKey);

		return await this.request<RawgGameDetail>(url);
	}

	private async request<T>(url: URL): Promise<T> {
		const response = await this.fetchRawg(url);
		this.handleErrors(response);
		return await this.parseBody<T>(response);
	}

	private async fetchRawg(url: URL): Promise<Response> {
		try {
			return await fetch(url.toString(), {
				signal: AbortSignal.timeout(this.requestTimeoutMs)
			});
		} catch (error) {
			if (isTimeoutError(error)) throw this.timeoutError();
			const reason = error instanceof Error ? error.message : "unknown";
			throw rawgServiceError.requestError(
				`RAWG request failed before a response: ${reason}`
			);
		}
	}

	private async parseBody<T>(response: Response): Promise<T> {
		try {
			return (await response.json()) as T;
		} catch (error) {
			if (isTimeoutError(error)) throw this.timeoutError();
			throw rawgServiceError.parseError(error);
		}
	}

	private timeoutError() {
		return rawgServiceError.requestError(
			`RAWG request timed out after ${this.requestTimeoutMs} ms`
		);
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
		return Promise.reject(rawgServiceError.disabledError());
	}

	getGameById(): Promise<RawgGameDetail> {
		return Promise.reject(rawgServiceError.disabledError());
	}

	getGameBySlug(): Promise<RawgGameDetail> {
		return Promise.reject(rawgServiceError.disabledError());
	}
}
