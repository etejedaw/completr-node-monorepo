import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MetacriticClient } from "../../src/metacritic/metacritic.provider";
import {
	assertServiceError,
	buildClient,
	createFakeClock,
	fetchThatHangsUntilAborted,
	htmlResponse,
	scriptedFetch
} from "../scraping/scraping-fakes";
import { captureRejection } from "../unit-helpers/mocks";
import {
	NOT_FOUND_PAGE,
	UNRELEASED_TBD_PAGE,
	WITCHER_3_PAGE,
	withJsonLd,
	withJsonLdFields,
	withScoreLabel
} from "./metacritic-fixtures";

const SERVICE = "Metacritic Provider";
const WITCHER_USER_LABEL = "User score 9.1 out of 10";
const WITCHER_META_LABEL = "Metascore 92 out of 100";

function clientRespondingWith(...responses: (Response | Error)[]) {
	const clock = createFakeClock();
	const scripted = scriptedFetch(clock, responses);
	return {
		client: new MetacriticClient(buildClient(clock, scripted.fetch)),
		calls: scripted.calls
	};
}

async function expectCode(promise: Promise<unknown>, code: string) {
	return assertServiceError(await captureRejection(promise), code, SERVICE);
}

async function parse(html: string, slug = "the-witcher-3-wild-hunt") {
	const { client } = clientRespondingWith(htmlResponse(html));
	return await client.getGameBySlug(slug);
}

void describe("MetacriticClient.create", () => {
	void it("returns the same shared instance every time", () => {
		assert.ok(MetacriticClient.create() instanceof MetacriticClient);
		assert.equal(MetacriticClient.create(), MetacriticClient.create());
	});
});

void describe("MetacriticClient.getGameBySlug parsing", () => {
	void it("parses the detail page of a game", async () => {
		const { client, calls } = clientRespondingWith(
			htmlResponse(WITCHER_3_PAGE)
		);

		const detail = await client.getGameBySlug("the-witcher-3-wild-hunt");

		assert.deepEqual(detail, {
			slug: "the-witcher-3-wild-hunt",
			title: "The Witcher 3: Wild Hunt",
			releaseYear: 2015,
			platforms: ["PC", "Xbox One", "PlayStation 4", "Nintendo Switch"],
			metaScore: 92,
			userScore: 9.1
		});
		assert.equal(
			calls[0]!.url,
			"https://www.metacritic.com/game/the-witcher-3-wild-hunt/"
		);
	});

	void it("returns null scores for an unreleased game with TBD scores", async () => {
		const detail = await parse(UNRELEASED_TBD_PAGE, "grand-theft-auto-vi");

		assert.deepEqual(detail, {
			slug: "grand-theft-auto-vi",
			title: "Grand Theft Auto VI",
			releaseYear: 2026,
			platforms: ["PlayStation 5", "Xbox Series X"],
			metaScore: null,
			userScore: null
		});
	});

	void it("returns a null User Score when it is tbd but the Metascore exists", async () => {
		const detail = await parse(
			withScoreLabel(WITCHER_3_PAGE, WITCHER_USER_LABEL, "User score tbd")
		);

		assert.equal(detail.metaScore, 92);
		assert.equal(detail.userScore, null);
	});

	void it("ignores the hidden 'my score' widget when the User Score is missing", async () => {
		const html = WITCHER_3_PAGE.replace(
			new RegExp(
				`(aria-label="${WITCHER_USER_LABEL}"\\s+)data-testid="global-score-value-wrapper"`
			),
			"$1"
		);

		assert.notEqual(html, WITCHER_3_PAGE);

		assert.match(html, /User score null out of 10/);
		assert.equal((await parse(html)).userScore, null);
	});

	void it("keeps scores of zero and integer User Scores", async () => {
		const detail = await parse(
			withScoreLabel(
				withJsonLdFields(WITCHER_3_PAGE, {
					aggregateRating: {
						"@type": "AggregateRating",
						ratingValue: 0
					}
				}),
				WITCHER_USER_LABEL,
				"User score 0 out of 10"
			)
		);

		assert.equal(detail.metaScore, 0);
		assert.equal(detail.userScore, 0);
	});

	void it("keeps decimal User Scores as they are", async () => {
		const detail = await parse(
			withScoreLabel(
				WITCHER_3_PAGE,
				WITCHER_USER_LABEL,
				"User score 7.25 out of 10"
			)
		);

		assert.equal(detail.userScore, 7.25);
	});

	void it("reads the Metascore from the hero when JSON-LD has no rating", async () => {
		const detail = await parse(
			withScoreLabel(
				withJsonLdFields(WITCHER_3_PAGE, {}, ["aggregateRating"]),
				WITCHER_META_LABEL,
				"Metascore 88 out of 100"
			)
		);

		assert.equal(detail.metaScore, 88);
	});

	void it("returns a null Metascore when JSON-LD has no rating and the hero says tbd", async () => {
		const detail = await parse(
			withScoreLabel(
				withJsonLdFields(WITCHER_3_PAGE, {}, ["aggregateRating"]),
				WITCHER_META_LABEL,
				"Metascore tbd"
			)
		);

		assert.equal(detail.metaScore, null);
		assert.equal(detail.userScore, 9.1);
	});

	void it("discards out-of-range or garbage scores", async () => {
		const detail = await parse(
			withScoreLabel(
				withScoreLabel(
					withJsonLdFields(WITCHER_3_PAGE, {
						aggregateRating: { ratingValue: "not a number" }
					}),
					WITCHER_META_LABEL,
					"Metascore 140 out of 100"
				),
				WITCHER_USER_LABEL,
				"User score 11 out of 10"
			)
		);

		assert.equal(detail.metaScore, null);
		assert.equal(detail.userScore, null);
	});

	void it("accepts a numeric string rating in JSON-LD", async () => {
		const detail = await parse(
			withJsonLdFields(WITCHER_3_PAGE, {
				aggregateRating: { ratingValue: "85" }
			})
		);

		assert.equal(detail.metaScore, 85);
	});

	void it("tolerates missing release date and platforms", async () => {
		const detail = await parse(
			withJsonLdFields(WITCHER_3_PAGE, { datePublished: "TBA 2027" }, [
				"gamePlatform"
			])
		);

		assert.equal(detail.releaseYear, null);
		assert.deepEqual(detail.platforms, []);
	});

	void it("accepts a single platform as a string and removes duplicates and blanks", async () => {
		const single = await parse(
			withJsonLdFields(WITCHER_3_PAGE, { gamePlatform: " PC " })
		);
		const repeated = await parse(
			withJsonLdFields(WITCHER_3_PAGE, {
				gamePlatform: ["PC", "PC", "", 42, "Xbox One"]
			})
		);

		assert.deepEqual(single.platforms, ["PC"]);
		assert.deepEqual(repeated.platforms, ["PC", "Xbox One"]);
	});

	void it("decodes HTML entities in the JSON-LD title", async () => {
		const detail = await parse(
			withJsonLdFields(WITCHER_3_PAGE, { name: "Ratchet &amp; Clank" })
		);

		assert.equal(detail.title, "Ratchet & Clank");
	});

	void it("returns the canonical slug when the site redirected to another one", async () => {
		const detail = await parse(
			withJsonLdFields(WITCHER_3_PAGE, {
				url: "https://www.metacritic.com/game/the-witcher-3-wild-hunt-complete-edition/"
			}),
			"witcher-3"
		);

		assert.equal(detail.slug, "the-witcher-3-wild-hunt-complete-edition");
	});

	void it("keeps the requested slug when the JSON-LD url is garbage", async () => {
		const detail = await parse(
			withJsonLdFields(WITCHER_3_PAGE, { url: "http://[::1" })
		);

		assert.equal(detail.slug, "the-witcher-3-wild-hunt");
	});

	void it("finds the VideoGame node inside an array or @graph and skips broken JSON-LD", async () => {
		const videoGame = {
			"@type": ["Product", "VideoGame"],
			name: "Graph Game",
			datePublished: "2020-01-01"
		};
		const html = withJsonLd(WITCHER_3_PAGE, "{ broken").replace(
			"</head>",
			`<script type="application/ld+json">[{"@type":"Organization","name":"Metacritic"},{"@graph":${JSON.stringify([videoGame])}}]</script></head>`
		);

		const detail = await parse(html);

		assert.equal(detail.title, "Graph Game");
		assert.equal(detail.releaseYear, 2020);
		assert.equal(detail.metaScore, 92);
	});

	void it("falls back to the hero title when JSON-LD is missing", async () => {
		const detail = await parse(withJsonLd(WITCHER_3_PAGE, undefined));

		assert.equal(detail.title, "The Witcher 3: Wild Hunt");
		assert.equal(detail.metaScore, 92);
		assert.equal(detail.userScore, 9.1);
		assert.equal(detail.releaseYear, null);
		assert.deepEqual(detail.platforms, []);
	});
});

void describe("MetacriticClient.getGameBySlug structure errors", () => {
	const brokenPages: [string, string][] = [
		["an empty body", ""],
		["an unrelated HTML page", "<html><body><p>Welcome</p></body></html>"],
		[
			"truncated HTML before JSON-LD and hero",
			WITCHER_3_PAGE.slice(0, 120)
		],
		[
			"a page with only broken JSON-LD",
			'<html><head><script type="application/ld+json">{"@type":"VideoGame","name":</script></head></html>'
		],
		[
			"JSON-LD without a VideoGame and no hero",
			'<html><head><script type="application/ld+json">{"@type":"WebSite","name":"Metacritic"}</script></head></html>'
		],
		["a soft 404 page served with 200", NOT_FOUND_PAGE]
	];

	for (const [name, html] of brokenPages) {
		void it(`${name} fails as METACRITIC_PARSE_ERROR`, async () => {
			const { client } = clientRespondingWith(htmlResponse(html));

			await expectCode(
				client.getGameBySlug("the-witcher-3-wild-hunt"),
				"METACRITIC_PARSE_ERROR"
			);
		});
	}
});

void describe("MetacriticClient.getGameBySlug request errors", () => {
	void it("404 fails as METACRITIC_NOT_FOUND", async () => {
		const { client } = clientRespondingWith(
			htmlResponse(NOT_FOUND_PAGE, 404)
		);

		await expectCode(
			client.getGameBySlug("no-such-game"),
			"METACRITIC_NOT_FOUND"
		);
	});

	for (const garbage of [
		"",
		"  ",
		"The Witcher",
		"../search/witcher",
		"witcher/",
		"-witcher",
		"witcher?x=1",
		"wítcher"
	]) {
		void it(`the slug ${JSON.stringify(garbage)} fails as METACRITIC_NOT_FOUND without any request`, async () => {
			const { client, calls } = clientRespondingWith();

			await expectCode(
				client.getGameBySlug(garbage),
				"METACRITIC_NOT_FOUND"
			);
			assert.equal(calls.length, 0);
		});
	}

	void it("accepts Metacritic slugs with repeated hyphens", async () => {
		const { client, calls } = clientRespondingWith(
			htmlResponse(WITCHER_3_PAGE)
		);

		await client.getGameBySlug("the-witcher-3-wild-hunt---blood-and-wine");

		assert.equal(
			calls[0]!.url,
			"https://www.metacritic.com/game/the-witcher-3-wild-hunt---blood-and-wine/"
		);
	});

	void it("persistent 429 fails as METACRITIC_RATE_LIMITED", async () => {
		const { client } = clientRespondingWith(
			htmlResponse("", 429),
			htmlResponse("", 429)
		);

		await expectCode(
			client.getGameBySlug("the-witcher-3-wild-hunt"),
			"METACRITIC_RATE_LIMITED"
		);
	});

	void it("403 fails as METACRITIC_BLOCKED", async () => {
		const { client } = clientRespondingWith(htmlResponse("Forbidden", 403));

		await expectCode(
			client.getGameBySlug("the-witcher-3-wild-hunt"),
			"METACRITIC_BLOCKED"
		);
	});

	void it("a CAPTCHA page fails as METACRITIC_BLOCKED", async () => {
		const { client } = clientRespondingWith(
			htmlResponse(
				'<html><body><div id="px-captcha"></div></body></html>'
			)
		);

		await expectCode(
			client.getGameBySlug("the-witcher-3-wild-hunt"),
			"METACRITIC_BLOCKED"
		);
	});

	void it("persistent 5xx fails as METACRITIC_REQUEST_ERROR", async () => {
		const { client } = clientRespondingWith(
			htmlResponse("", 502),
			htmlResponse("", 504)
		);

		await expectCode(
			client.getGameBySlug("the-witcher-3-wild-hunt"),
			"METACRITIC_REQUEST_ERROR"
		);
	});

	void it("a network failure fails as METACRITIC_REQUEST_ERROR", async () => {
		const { client } = clientRespondingWith(
			new TypeError("getaddrinfo ENOTFOUND"),
			new TypeError("getaddrinfo ENOTFOUND")
		);

		await expectCode(
			client.getGameBySlug("the-witcher-3-wild-hunt"),
			"METACRITIC_REQUEST_ERROR"
		);
	});

	void it("a request that never answers fails as METACRITIC_TIMEOUT", async () => {
		const client = new MetacriticClient(
			buildClient(createFakeClock(), fetchThatHangsUntilAborted(), {
				maxRetries: 0
			})
		);

		await expectCode(
			client.getGameBySlug("the-witcher-3-wild-hunt"),
			"METACRITIC_TIMEOUT"
		);
	});

	void it("concurrent lookups of different games come back to the right caller", async () => {
		const { client, calls } = clientRespondingWith(
			htmlResponse(WITCHER_3_PAGE),
			htmlResponse(UNRELEASED_TBD_PAGE)
		);

		const [witcher, gta] = await Promise.all([
			client.getGameBySlug("the-witcher-3-wild-hunt"),
			client.getGameBySlug("grand-theft-auto-vi")
		]);

		assert.equal(witcher.title, "The Witcher 3: Wild Hunt");
		assert.equal(gta.title, "Grand Theft Auto VI");
		assert.ok(calls[1]!.at - calls[0]!.at >= 5000);
	});
});
