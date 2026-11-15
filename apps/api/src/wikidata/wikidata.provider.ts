import { type ScrapingRequestOptions } from "../scraping/scraping.interface";
import { ScrapingHttpClient } from "../scraping/scraping-http.client";
import { asRecord } from "../scraping/utils/as-record.util";
import { parseReleaseYear } from "../scraping/utils/parse-release-year.util";
import * as wikidataServiceError from "./errors/wikidata.service-error";
import { buildHltbCandidatesQuery } from "./utils/build-hltb-candidates-query.util";
import { keepEarliestYear } from "./utils/keep-earliest-year.util";
import { readBindingValue } from "./utils/read-binding-value.util";
import {
	HLTB_ID_PATTERN,
	SPARQL_ENDPOINT,
	SPARQL_JSON_HEADERS,
	WIKIDATA_HTTP_OPTIONS
} from "./wikidata.constants";
import {
	type WikidataHltbCandidate,
	type WikidataHltbQuery
} from "./wikidata.interface";

export class WikidataClient {
	private static sharedInstance?: WikidataClient;

	constructor(private readonly http: ScrapingHttpClient) {}

	static create(): WikidataClient {
		WikidataClient.sharedInstance ??= new WikidataClient(
			new ScrapingHttpClient(WIKIDATA_HTTP_OPTIONS)
		);
		return WikidataClient.sharedInstance;
	}

	async findHltbCandidates(
		query: WikidataHltbQuery,
		options: ScrapingRequestOptions = {}
	): Promise<WikidataHltbCandidate[]> {
		const sparql = buildHltbCandidatesQuery(query);
		if (!sparql) return [];

		const url = new URL(SPARQL_ENDPOINT);
		url.searchParams.set("query", sparql);

		const body = await this.fetchResults(url, options);
		return this.parseCandidates(body);
	}

	private async fetchResults(
		url: URL,
		options: ScrapingRequestOptions
	): Promise<string> {
		try {
			return await this.http.getText(url, SPARQL_JSON_HEADERS, options);
		} catch (error) {
			throw wikidataServiceError.fromRequestFailure(error);
		}
	}

	private parseCandidates(body: string): WikidataHltbCandidate[] {
		const candidates = new Map<string, WikidataHltbCandidate>();

		for (const binding of this.readBindings(body)) {
			const candidate = this.readCandidate(binding);
			if (!candidate) continue;

			const key = [
				readBindingValue(binding, "item"),
				candidate.hltbId,
				candidate.rawgSlug,
				candidate.label
			].join("|");
			const existing = candidates.get(key);
			candidates.set(
				key,
				existing ? keepEarliestYear(existing, candidate) : candidate
			);
		}

		return [...candidates.values()];
	}

	private readBindings(body: string): Record<string, unknown>[] {
		let parsed: unknown;
		try {
			parsed = JSON.parse(body);
		} catch (error) {
			throw wikidataServiceError.parseError(error);
		}

		const bindings = asRecord(asRecord(parsed)?.results)?.bindings;
		if (!Array.isArray(bindings))
			throw wikidataServiceError.parseError(
				"Missing results.bindings in SPARQL response"
			);

		return bindings
			.map(binding => asRecord(binding))
			.filter(binding => binding !== undefined);
	}

	private readCandidate(
		binding: Record<string, unknown>
	): WikidataHltbCandidate | null {
		const hltbId = readBindingValue(binding, "hltbId")?.trim();
		if (!hltbId || !HLTB_ID_PATTERN.test(hltbId)) return null;

		return {
			hltbId,
			label: readBindingValue(binding, "label")?.trim() || null,
			releaseYear: parseReleaseYear(
				readBindingValue(binding, "publication")
			),
			rawgSlug: readBindingValue(binding, "rawgSlug")?.trim() || null
		};
	}
}
