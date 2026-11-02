import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	buildHltbCandidatesQuery,
	escapeSparqlString,
	WIKIDATA_HTTP_OPTIONS,
	WikidataClient
} from "../../src/wikidata/wikidata.provider";
import {
	assertServiceError,
	buildClient,
	createFakeClock,
	fetchThatHangsUntilAborted,
	htmlResponse,
	scriptedFetch
} from "../scraping/scraping-fakes";
import { captureRejection } from "../unit-helpers/mocks";

const SERVICE = "Wikidata Provider";
const WITCHER_QUERY = {
	rawgSlug: "the-witcher-3-wild-hunt",
	title: "The Witcher 3: Wild Hunt"
};
// A SPARQL double-quoted literal: "plain", "with \"escaped\" quotes" or "a\\b"
const SPARQL_DOUBLE_QUOTED_LITERAL = /"((?:[^"\\\n\r]|\\.)*)"/g;
const SPARQL_UNESCAPES: Record<string, string> = {
	n: "\n",
	r: "\r",
	t: "\t",
	b: "\b",
	f: "\f"
};

interface BindingFields {
	item?: string;
	hltbId?: string;
	label?: string;
	rawgSlug?: string;
	publication?: string;
}

function binding(fields: BindingFields) {
	return Object.fromEntries(
		Object.entries({
			item: "http://www.wikidata.org/entity/Q1",
			...fields
		}).map(([name, value]) => [name, { type: "literal", value }])
	);
}

function sparqlResponse(bindings: unknown[], status = 200) {
	return new Response(
		JSON.stringify({
			head: {
				vars: ["item", "hltbId", "label", "rawgSlug", "publication"]
			},
			results: { bindings }
		}),
		{
			status,
			headers: { "Content-Type": "application/sparql-results+json" }
		}
	);
}

function clientRespondingWith(...responses: (Response | Error)[]) {
	const clock = createFakeClock();
	const scripted = scriptedFetch(clock, responses);
	return {
		client: new WikidataClient(buildClient(clock, scripted.fetch)),
		calls: scripted.calls
	};
}

function sentQuery(call: { url: string }) {
	const url = new URL(call.url);
	assert.equal(
		`${url.origin}${url.pathname}`,
		"https://query.wikidata.org/sparql"
	);
	return url.searchParams.get("query") ?? "";
}

function sparqlLiterals(query: string) {
	return [...query.matchAll(SPARQL_DOUBLE_QUOTED_LITERAL)].map(([, body]) =>
		body!.replace(
			/\\(.)/g,
			(_match, char: string) => SPARQL_UNESCAPES[char] ?? char
		)
	);
}

async function expectCode(promise: Promise<unknown>, code: string) {
	return assertServiceError(await captureRejection(promise), code, SERVICE);
}

void describe("WikidataClient.create", () => {
	void it("returns the same shared instance every time", () => {
		assert.ok(WikidataClient.create() instanceof WikidataClient);
		assert.equal(WikidataClient.create(), WikidataClient.create());
	});
});

void describe("WikidataClient.findHltbCandidates request", () => {
	void it("sends a single GET to the SPARQL endpoint asking for JSON results", async () => {
		const { client, calls } = clientRespondingWith(sparqlResponse([]));

		await client.findHltbCandidates(WITCHER_QUERY);

		assert.equal(calls.length, 1);
		const headers = calls[0]!.init.headers as Record<string, string>;
		assert.equal(headers.Accept, "application/sparql-results+json");
		assert.equal(
			headers["User-Agent"],
			"CompletrBot/1.0 (+https://www.completr.app)"
		);
		assert.equal(calls[0]!.init.method, undefined);
	});

	void it("asks by RAWG slug UNION exact English label, both with an HLTB id and an optional publication date", async () => {
		const { client, calls } = clientRespondingWith(sparqlResponse([]));

		await client.findHltbCandidates(WITCHER_QUERY);

		const query = sentQuery(calls[0]!);
		assert.match(
			query,
			/\{ \?item wdt:P9968 "the-witcher-3-wild-hunt" \. \} UNION \{ \?item rdfs:label "The Witcher 3: Wild Hunt"@en \. \}/
		);
		assert.match(query, /\?item wdt:P2816 \?hltbId \./);
		assert.match(query, /OPTIONAL \{ \?item wdt:P577 \?publication \. \}/);
	});

	void it("asks only by label when the game has no slug", async () => {
		const { client, calls } = clientRespondingWith(sparqlResponse([]));

		await client.findHltbCandidates({ rawgSlug: "  ", title: "Celeste" });

		const query = sentQuery(calls[0]!);
		assert.doesNotMatch(query, /P9968 "/);
		assert.doesNotMatch(query, /UNION/);
		assert.match(query, /\{ \?item rdfs:label "Celeste"@en \. \}/);
	});

	void it("does not call Wikidata when there is neither slug nor title", async () => {
		const { client, calls } = clientRespondingWith();

		assert.deepEqual(
			await client.findHltbCandidates({ rawgSlug: null, title: " " }),
			[]
		);
		assert.equal(calls.length, 0);
	});
});

void describe("WikidataClient.findHltbCandidates parsing", () => {
	void it("returns the candidates found by slug and by label", async () => {
		const { client } = clientRespondingWith(
			sparqlResponse([
				binding({
					item: "http://www.wikidata.org/entity/Q19560151",
					hltbId: "10270",
					label: "The Witcher 3: Wild Hunt",
					rawgSlug: "the-witcher-3-wild-hunt",
					publication: "2015-05-19T00:00:00Z"
				}),
				binding({
					item: "http://www.wikidata.org/entity/Q2",
					hltbId: "999",
					label: "The Witcher 3: Wild Hunt"
				})
			])
		);

		assert.deepEqual(await client.findHltbCandidates(WITCHER_QUERY), [
			{
				hltbId: "10270",
				label: "The Witcher 3: Wild Hunt",
				releaseYear: 2015,
				rawgSlug: "the-witcher-3-wild-hunt"
			},
			{
				hltbId: "999",
				label: "The Witcher 3: Wild Hunt",
				releaseYear: null,
				rawgSlug: null
			}
		]);
	});

	void it("collapses the rows of several publication dates into the earliest year", async () => {
		const { client } = clientRespondingWith(
			sparqlResponse([
				binding({
					hltbId: "10270",
					label: "W3",
					publication: "2016-10-01T00:00:00Z"
				}),
				binding({
					hltbId: "10270",
					label: "W3",
					publication: "2015-05-19T00:00:00Z"
				}),
				binding({ hltbId: "10270", label: "W3" })
			])
		);

		assert.deepEqual(await client.findHltbCandidates(WITCHER_QUERY), [
			{ hltbId: "10270", label: "W3", releaseYear: 2015, rawgSlug: null }
		]);
	});

	void it("skips rows whose HLTB id is missing or not numeric", async () => {
		const { client } = clientRespondingWith(
			sparqlResponse([
				binding({ label: "No id" }),
				binding({ hltbId: "abc", label: "Bad id" }),
				binding({ hltbId: " 42 ", label: "Good" }),
				"not an object"
			])
		);

		assert.deepEqual(await client.findHltbCandidates(WITCHER_QUERY), [
			{ hltbId: "42", label: "Good", releaseYear: null, rawgSlug: null }
		]);
	});

	void it("returns an empty list when nothing matches", async () => {
		const { client } = clientRespondingWith(sparqlResponse([]));

		assert.deepEqual(await client.findHltbCandidates(WITCHER_QUERY), []);
	});

	void it("fails as WIKIDATA_PARSE_ERROR on a body that is not JSON", async () => {
		const { client } = clientRespondingWith(
			htmlResponse("<html>oops</html>")
		);

		await expectCode(
			client.findHltbCandidates(WITCHER_QUERY),
			"WIKIDATA_PARSE_ERROR"
		);
	});

	void it("fails as WIKIDATA_PARSE_ERROR on JSON without results.bindings", async () => {
		const { client } = clientRespondingWith(
			new Response(JSON.stringify({ results: {} }), { status: 200 })
		);

		await expectCode(
			client.findHltbCandidates(WITCHER_QUERY),
			"WIKIDATA_PARSE_ERROR"
		);
	});
});

void describe("WikidataClient.findHltbCandidates failures", () => {
	void it("persistent 429 fails as WIKIDATA_RATE_LIMITED after one retry", async () => {
		const { client, calls } = clientRespondingWith(
			htmlResponse("", 429),
			htmlResponse("", 429)
		);

		const error = await expectCode(
			client.findHltbCandidates(WITCHER_QUERY),
			"WIKIDATA_RATE_LIMITED"
		);

		assert.equal(calls.length, 2);
		assert.equal(
			(error.serviceError.raw as { status: number }).status,
			429
		);
	});

	void it("waits out the two-minute Retry-After that Wikidata sends with a 429 and retries", async () => {
		const clock = createFakeClock();
		const scripted = scriptedFetch(clock, [
			htmlResponse("", 429, { "Retry-After": "120" }),
			sparqlResponse([binding({ hltbId: "10270" })])
		]);
		const client = new WikidataClient(
			buildClient(clock, scripted.fetch, WIKIDATA_HTTP_OPTIONS)
		);

		const candidates = await client.findHltbCandidates(WITCHER_QUERY);

		assert.equal(scripted.calls.length, 2);
		assert.ok(
			scripted.calls[1]!.at - scripted.calls[0]!.at >= 120_000,
			"the retry waits for Retry-After"
		);
		assert.deepEqual(
			candidates.map(candidate => candidate.hltbId),
			["10270"]
		);
	});

	void it("a Retry-After longer than five minutes fails as WIKIDATA_RATE_LIMITED without retrying", async () => {
		const clock = createFakeClock();
		const scripted = scriptedFetch(clock, [
			htmlResponse("", 429, { "Retry-After": "301" })
		]);
		const client = new WikidataClient(
			buildClient(clock, scripted.fetch, WIKIDATA_HTTP_OPTIONS)
		);

		await expectCode(
			client.findHltbCandidates(WITCHER_QUERY),
			"WIKIDATA_RATE_LIMITED"
		);
		assert.equal(scripted.calls.length, 1);
	});

	void it("403 fails as WIKIDATA_BLOCKED without retrying", async () => {
		const { client, calls } = clientRespondingWith(
			htmlResponse("Forbidden", 403)
		);

		await expectCode(
			client.findHltbCandidates(WITCHER_QUERY),
			"WIKIDATA_BLOCKED"
		);
		assert.equal(calls.length, 1);
	});

	void it("a hanging request fails as WIKIDATA_TIMEOUT", async () => {
		const clock = createFakeClock();
		const client = new WikidataClient(
			buildClient(clock, fetchThatHangsUntilAborted(), { maxRetries: 0 })
		);

		await expectCode(
			client.findHltbCandidates(WITCHER_QUERY),
			"WIKIDATA_TIMEOUT"
		);
	});

	void it("an aborted interactive request fails as WIKIDATA_ABORTED without retrying", async () => {
		let attempts = 0;
		const hanging = fetchThatHangsUntilAborted();
		const client = new WikidataClient(
			buildClient(
				createFakeClock(),
				(url, init) => {
					attempts += 1;
					return hanging(url, init);
				},
				{ timeoutMs: 60_000 }
			)
		);
		const controller = new AbortController();

		const pending = client.findHltbCandidates(WITCHER_QUERY, {
			priority: "interactive",
			signal: controller.signal
		});
		await new Promise(resolve => setImmediate(resolve));
		controller.abort();

		await expectCode(pending, "WIKIDATA_ABORTED");
		assert.equal(attempts, 1);
	});

	void it("a 404 or 400 from the endpoint fails as WIKIDATA_REQUEST_ERROR", async () => {
		for (const status of [404, 400]) {
			const { client } = clientRespondingWith(htmlResponse("", status));

			await expectCode(
				client.findHltbCandidates(WITCHER_QUERY),
				"WIKIDATA_REQUEST_ERROR"
			);
		}
	});

	void it("a network failure on both attempts fails as WIKIDATA_REQUEST_ERROR", async () => {
		const { client } = clientRespondingWith(
			new Error("ECONNRESET"),
			new Error("ECONNRESET")
		);

		await expectCode(
			client.findHltbCandidates(WITCHER_QUERY),
			"WIKIDATA_REQUEST_ERROR"
		);
	});
});

void describe("SPARQL escaping", () => {
	const hostileTitles = [
		'Say "Hello"',
		"Back\\slash",
		"Trailing backslash\\",
		'Break" } UNION { ?item ?p ?o } #',
		'Escaped quote \\" still inside',
		"Line\nbreak",
		"Carriage\rreturn\tand tab",
		"Tom Clancy's Rainbow Six® Siege"
	];

	for (const title of hostileTitles) {
		void it(`keeps ${JSON.stringify(title)} inside one literal`, async () => {
			const { client, calls } = clientRespondingWith(sparqlResponse([]));

			await client.findHltbCandidates({ rawgSlug: 'slug"} #', title });

			const query = sentQuery(calls[0]!);
			assert.deepEqual(sparqlLiterals(query), ['slug"} #', title, "en"]);
			assert.doesNotMatch(query, /[\n\r]"|"[\n\r]/);
			assert.equal(
				query.split("\n").length,
				buildHltbCandidatesQuery({ rawgSlug: "s", title: "t" })!.split(
					"\n"
				).length
			);
		});
	}

	void it("escapes quotes, backslashes and control characters", () => {
		assert.equal(
			escapeSparqlString('a"b\\c\nd\re\tf'),
			'a\\"b\\\\c\\nd\\re\\tf'
		);
	});
});
