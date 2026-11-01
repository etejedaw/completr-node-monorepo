import { type ScrapingRequestOptions } from "../scraping/scraping.interface";
import { ScrapingHttpClient } from "../scraping/scraping-http.client";
import { asRecord } from "../scraping/utils/as-record.util";
import { parseReleaseYear } from "../scraping/utils/parse-release-year.util";
import * as wikidataServiceError from "./errors/wikidata.service-error";
import {
	type WikidataHltbCandidate,
	type WikidataHltbQuery
} from "./wikidata.interface";

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const SPARQL_JSON_HEADERS = { Accept: "application/sparql-results+json" };
const WIKIDATA_THROTTLE = { minDelayMs: 1000, jitterMs: 500 };
const HLTB_ID_PATTERN = /^\d+$/;
const SPARQL_STRING_ESCAPES: Record<string, string> = {
	"\\": "\\\\",
	'"': '\\"',
	"\n": "\\n",
	"\r": "\\r",
	"\t": "\\t",
	"\b": "\\b",
	"\f": "\\f"
};
const SPARQL_STRING_SPECIAL_CHARS = /["\\\n\r\t\b\f]/g;

export class WikidataClient {
	private static sharedInstance?: WikidataClient;

	constructor(private readonly http: ScrapingHttpClient) {}

	static create(): WikidataClient {
		WikidataClient.sharedInstance ??= new WikidataClient(
			new ScrapingHttpClient(WIKIDATA_THROTTLE)
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

export function escapeSparqlString(value: string) {
	return value.replace(
		SPARQL_STRING_SPECIAL_CHARS,
		char => SPARQL_STRING_ESCAPES[char] ?? char
	);
}

export function buildHltbCandidatesQuery({
	rawgSlug,
	title
}: WikidataHltbQuery): string | null {
	const slug = rawgSlug?.trim();
	const label = title.trim();
	const branches = [
		...(slug ? [`?item wdt:P9968 "${escapeSparqlString(slug)}" .`] : []),
		...(label
			? [`?item rdfs:label "${escapeSparqlString(label)}"@en .`]
			: [])
	];
	if (branches.length === 0) return null;

	return [
		"SELECT ?item ?hltbId ?label ?rawgSlug ?publication WHERE {",
		`  ${branches.map(branch => `{ ${branch} }`).join(" UNION ")}`,
		"  ?item wdt:P2816 ?hltbId .",
		'  OPTIONAL { ?item rdfs:label ?label . FILTER(LANG(?label) = "en") }',
		"  OPTIONAL { ?item wdt:P9968 ?rawgSlug . }",
		"  OPTIONAL { ?item wdt:P577 ?publication . }",
		"}"
	].join("\n");
}

function readBindingValue(
	binding: Record<string, unknown>,
	name: string
): string | undefined {
	const value = asRecord(binding[name])?.value;
	return typeof value === "string" ? value : undefined;
}

function keepEarliestYear(
	existing: WikidataHltbCandidate,
	candidate: WikidataHltbCandidate
): WikidataHltbCandidate {
	if (candidate.releaseYear === null) return existing;
	if (
		existing.releaseYear === null ||
		candidate.releaseYear < existing.releaseYear
	)
		return { ...existing, releaseYear: candidate.releaseYear };
	return existing;
}
