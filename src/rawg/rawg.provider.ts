import { RawgGameDetail, RawgGameSearchResult } from "./rawg.interface";
import * as rawgServiceError from "./errors/rawg.service-error";

export class RawgProvider {
	private readonly BASE_URL = "https://api.rawg.io/api";

	constructor(private readonly apiKey: string) {}

	async searchGame(
		query: string,
		pageSize = 5
	): Promise<RawgGameSearchResult[]> {
		const url = new URL(`${this.BASE_URL}/games`);
		url.searchParams.set("key", this.apiKey);
		url.searchParams.set("search", query);
		url.searchParams.set("page_size", pageSize.toString());
		url.searchParams.set("search_precise", "true");

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
