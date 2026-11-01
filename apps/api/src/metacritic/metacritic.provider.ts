import { type CheerioAPI, load } from "cheerio";

import { decodeHtmlEntities } from "../common/utils/decode-html-entities.util";
import { type ScrapingRequestOptions } from "../scraping/scraping.interface";
import { ScrapingHttpClient } from "../scraping/scraping-http.client";
import { asRecord } from "../scraping/utils/as-record.util";
import { parseReleaseYear } from "../scraping/utils/parse-release-year.util";
import { toFiniteNumber } from "../scraping/utils/to-finite-number.util";
import * as metacriticServiceError from "./errors/metacritic.service-error";
import {
	type MetacriticGameDetail,
	type MetacriticScoreLabel
} from "./metacritic.interface";

const BASE_URL = "https://www.metacritic.com";
// e.g. "the-witcher-3-wild-hunt" or "the-witcher-3-wild-hunt---blood-and-wine"
const SLUG_PATTERN = /^[a-z0-9]+(?:-+[a-z0-9]+)*$/;
const VIDEO_GAME_TYPE = "VideoGame";
const SCORE_LABEL_SELECTOR = '[data-testid="global-score-value-wrapper"]';
const HERO_TITLE_SELECTOR = '[data-testid="hero-title"]';
// e.g. "/game/the-witcher-3-wild-hunt/" → "the-witcher-3-wild-hunt"
const GAME_URL_SLUG_PATTERN = /\/game\/([a-z0-9-]+)\/?$/;
const META_SCORE_LABEL: MetacriticScoreLabel = {
	prefix: /^Metascore\b/i,
	// e.g. "Metascore 92 out of 100"
	value: /^Metascore\s+(\d{1,3})\s+out of 100$/i,
	max: 100
};
const USER_SCORE_LABEL: MetacriticScoreLabel = {
	prefix: /^User score\b/i,
	// e.g. "User score 9.1 out of 10"
	value: /^User score\s+(\d{1,2}(?:\.\d+)?)\s+out of 10$/i,
	max: 10
};

export class MetacriticClient {
	private static sharedInstance?: MetacriticClient;

	constructor(private readonly http: ScrapingHttpClient) {}

	static create(): MetacriticClient {
		MetacriticClient.sharedInstance ??= new MetacriticClient(
			ScrapingHttpClient.shared()
		);
		return MetacriticClient.sharedInstance;
	}

	async getGameBySlug(
		slug: string,
		options: ScrapingRequestOptions = {}
	): Promise<MetacriticGameDetail> {
		const requestedSlug = slug.trim();
		if (!SLUG_PATTERN.test(requestedSlug))
			throw metacriticServiceError.notFoundError({ slug });

		const html = await this.fetchPage(
			new URL(`/game/${requestedSlug}/`, BASE_URL),
			options
		);
		return this.parseGamePage(html, requestedSlug);
	}

	private async fetchPage(
		url: URL,
		options: ScrapingRequestOptions
	): Promise<string> {
		try {
			return await this.http.getHtml(url, options);
		} catch (error) {
			throw metacriticServiceError.fromRequestFailure(error);
		}
	}

	private parseGamePage(
		html: string,
		requestedSlug: string
	): MetacriticGameDetail {
		const $ = load(html);
		const videoGame = this.findVideoGameJsonLd($);
		const title = this.readTitle($, videoGame);

		if (!title)
			throw metacriticServiceError.parseError(
				"Missing game title in JSON-LD and hero"
			);

		return {
			slug: this.readCanonicalSlug(videoGame) ?? requestedSlug,
			title,
			releaseYear: parseReleaseYear(videoGame?.datePublished),
			platforms: this.readPlatforms(videoGame?.gamePlatform),
			metaScore:
				this.readJsonLdMetaScore(videoGame) ??
				this.readScoreLabel($, META_SCORE_LABEL),
			userScore: this.readScoreLabel($, USER_SCORE_LABEL)
		};
	}

	private findVideoGameJsonLd(
		$: CheerioAPI
	): Record<string, unknown> | undefined {
		const scripts = $('script[type="application/ld+json"]').toArray();

		for (const script of scripts) {
			const candidates = this.jsonLdNodes(
				this.parseJson($(script).text())
			);
			const videoGame = candidates.find(node => this.isVideoGame(node));
			if (videoGame) return videoGame;
		}

		return undefined;
	}

	private parseJson(text: string): unknown {
		try {
			return JSON.parse(text);
		} catch {
			return undefined;
		}
	}

	private jsonLdNodes(value: unknown): Record<string, unknown>[] {
		if (Array.isArray(value))
			return value.flatMap(item => this.jsonLdNodes(item));

		const node = asRecord(value);
		if (!node) return [];

		const graph = node["@graph"];
		return Array.isArray(graph)
			? [node, ...this.jsonLdNodes(graph)]
			: [node];
	}

	private isVideoGame(node: Record<string, unknown>) {
		const type = node["@type"];
		return Array.isArray(type)
			? type.includes(VIDEO_GAME_TYPE)
			: type === VIDEO_GAME_TYPE;
	}

	private readTitle(
		$: CheerioAPI,
		videoGame: Record<string, unknown> | undefined
	): string {
		const jsonLdTitle =
			typeof videoGame?.name === "string" ? videoGame.name.trim() : "";
		if (jsonLdTitle) return decodeHtmlEntities(jsonLdTitle);

		return $(HERO_TITLE_SELECTOR).first().text().trim();
	}

	private readCanonicalSlug(
		videoGame: Record<string, unknown> | undefined
	): string | null {
		if (typeof videoGame?.url !== "string") return null;

		let pathname: string;
		try {
			pathname = new URL(videoGame.url, BASE_URL).pathname;
		} catch {
			return null;
		}

		return GAME_URL_SLUG_PATTERN.exec(pathname)?.[1] ?? null;
	}

	private readPlatforms(value: unknown): string[] {
		const names = Array.isArray(value) ? value : [value];
		const platforms = names
			.filter((name): name is string => typeof name === "string")
			.map(name => name.trim())
			.filter(Boolean);

		return [...new Set(platforms)];
	}

	private readJsonLdMetaScore(
		videoGame: Record<string, unknown> | undefined
	): number | null {
		const rating = asRecord(videoGame?.aggregateRating);
		return this.inRange(
			toFiniteNumber(rating?.ratingValue),
			META_SCORE_LABEL.max
		);
	}

	private readScoreLabel(
		$: CheerioAPI,
		scoreLabel: MetacriticScoreLabel
	): number | null {
		const label = $(SCORE_LABEL_SELECTOR)
			.toArray()
			.map(element =>
				(
					$(element).attr("aria-label") ??
					$(element).attr("title") ??
					""
				).trim()
			)
			.find(text => scoreLabel.prefix.test(text));

		const match = label ? scoreLabel.value.exec(label) : null;
		return match ? this.inRange(Number(match[1]), scoreLabel.max) : null;
	}

	private inRange(value: number | null, max: number): number | null {
		if (value === null || !Number.isFinite(value)) return null;
		return value >= 0 && value <= max ? value : null;
	}
}
