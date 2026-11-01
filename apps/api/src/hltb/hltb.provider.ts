import { load } from "cheerio";

import { type ScrapingRequestOptions } from "../scraping/scraping.interface";
import { ScrapingHttpClient } from "../scraping/scraping-http.client";
import { asRecord } from "../scraping/utils/as-record.util";
import { parseReleaseYear } from "../scraping/utils/parse-release-year.util";
import { toFiniteNumber } from "../scraping/utils/to-finite-number.util";
import * as hltbServiceError from "./errors/hltb.service-error";
import { type HltbGameDetail } from "./hltb.interface";

const BASE_URL = "https://howlongtobeat.com";
const GAME_ID_PATTERN = /^\d+$/;
const NOT_FOUND_PAGE = "/404";
const SECONDS_PER_HOUR = 3600;
const RELEASE_DATE_FIELDS = [
	"release_world",
	"release_na",
	"release_eu",
	"release_jp"
] as const;

export class HltbClient {
	private static sharedInstance?: HltbClient;

	constructor(private readonly http: ScrapingHttpClient) {}

	static create(): HltbClient {
		HltbClient.sharedInstance ??= new HltbClient(
			ScrapingHttpClient.shared()
		);
		return HltbClient.sharedInstance;
	}

	async getGameById(
		externalId: string,
		options: ScrapingRequestOptions = {}
	): Promise<HltbGameDetail> {
		const id = externalId.trim();
		if (!GAME_ID_PATTERN.test(id))
			throw hltbServiceError.notFoundError({ externalId });

		const html = await this.fetchPage(
			new URL(`/game/${id}`, BASE_URL),
			options
		);
		return this.parseGamePage(html, id);
	}

	private async fetchPage(
		url: URL,
		options: ScrapingRequestOptions
	): Promise<string> {
		try {
			return await this.http.getHtml(url, options);
		} catch (error) {
			throw hltbServiceError.fromRequestFailure(error);
		}
	}

	private parseGamePage(html: string, requestedId: string): HltbGameDetail {
		const nextData = this.readNextData(html);

		if (nextData.page === NOT_FOUND_PAGE)
			throw hltbServiceError.notFoundError({ externalId: requestedId });

		const games = asRecord(
			asRecord(asRecord(asRecord(nextData.props)?.pageProps)?.game)?.data
		)?.game;

		if (!Array.isArray(games))
			throw hltbServiceError.parseError(
				"Missing game data in __NEXT_DATA__"
			);

		if (games.length === 0)
			throw hltbServiceError.notFoundError({ externalId: requestedId });

		const game = asRecord(games[0]);
		const title =
			typeof game?.game_name === "string" ? game.game_name.trim() : "";

		if (!game || !title)
			throw hltbServiceError.parseError(
				"Missing game title in __NEXT_DATA__"
			);

		return {
			id: this.readGameId(game.game_id) ?? requestedId,
			title,
			releaseYear: this.readReleaseYear(game),
			mainStoryHours: this.secondsToHours(game.comp_main),
			mainExtrasHours: this.secondsToHours(game.comp_plus),
			completionistHours: this.secondsToHours(game.comp_100)
		};
	}

	private readNextData(html: string): Record<string, unknown> {
		const script = load(html)("script#__NEXT_DATA__").first().text();
		if (!script.trim())
			throw hltbServiceError.parseError("Missing __NEXT_DATA__ script");

		let parsed: unknown;
		try {
			parsed = JSON.parse(script);
		} catch (error) {
			throw hltbServiceError.parseError(error);
		}

		const nextData = asRecord(parsed);
		if (!nextData)
			throw hltbServiceError.parseError("__NEXT_DATA__ is not an object");

		return nextData;
	}

	private readGameId(value: unknown): string | null {
		const id = toFiniteNumber(value);
		return id !== null && Number.isInteger(id) && id > 0
			? String(id)
			: null;
	}

	private readReleaseYear(game: Record<string, unknown>): number | null {
		for (const field of RELEASE_DATE_FIELDS) {
			const year = parseReleaseYear(game[field]);
			if (year !== null) return year;
		}
		return null;
	}

	private secondsToHours(value: unknown): number | null {
		const seconds = toFiniteNumber(value);
		if (seconds === null || seconds <= 0) return null;

		const hours = Math.round((seconds / SECONDS_PER_HOUR) * 100) / 100;
		return hours > 0 ? hours : null;
	}
}
