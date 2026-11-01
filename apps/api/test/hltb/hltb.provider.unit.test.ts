import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HltbClient } from "../../src/hltb/hltb.provider";
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
	BLOOD_AND_WINE_DLC_PAGE,
	NOT_FOUND_PAGE,
	WITCHER_3_PAGE,
	withGameFields,
	withNextData
} from "./hltb-fixtures";

const SERVICE = "HLTB Provider";

function clientRespondingWith(...responses: (Response | Error)[]) {
	const clock = createFakeClock();
	const scripted = scriptedFetch(clock, responses);
	return {
		client: new HltbClient(buildClient(clock, scripted.fetch)),
		calls: scripted.calls
	};
}

async function expectCode(promise: Promise<unknown>, code: string) {
	return assertServiceError(await captureRejection(promise), code, SERVICE);
}

void describe("HltbClient.create", () => {
	void it("returns the same shared instance every time", () => {
		assert.ok(HltbClient.create() instanceof HltbClient);
		assert.equal(HltbClient.create(), HltbClient.create());
	});
});

void describe("HltbClient.getGameById parsing", () => {
	void it("parses the detail page of a game", async () => {
		const { client, calls } = clientRespondingWith(
			htmlResponse(WITCHER_3_PAGE)
		);

		const detail = await client.getGameById("10270");

		assert.deepEqual(detail, {
			id: "10270",
			title: "The Witcher 3: Wild Hunt",
			releaseYear: 2015,
			mainStoryHours: 51.67,
			mainExtrasHours: 103.77,
			completionistHours: 175.26
		});
		assert.equal(calls[0]!.url, "https://howlongtobeat.com/game/10270");
	});

	void it("parses a DLC page like any other game", async () => {
		const { client } = clientRespondingWith(
			htmlResponse(BLOOD_AND_WINE_DLC_PAGE)
		);

		const detail = await client.getGameById("33660");

		assert.equal(detail.id, "33660");
		assert.equal(detail.title, "The Witcher 3: Wild Hunt - Blood and Wine");
		assert.equal(detail.releaseYear, 2016);
		assert.equal(detail.mainStoryHours, 15.16);
	});

	void it("trims whitespace around the requested id", async () => {
		const { client, calls } = clientRespondingWith(
			htmlResponse(WITCHER_3_PAGE)
		);

		await client.getGameById(" 10270 ");

		assert.equal(calls[0]!.url, "https://howlongtobeat.com/game/10270");
	});

	void it("returns null for a Main Story of zero while keeping the other durations", async () => {
		const { client } = clientRespondingWith(
			htmlResponse(withGameFields(WITCHER_3_PAGE, { comp_main: 0 }))
		);

		const detail = await client.getGameById("10270");

		assert.equal(detail.mainStoryHours, null);
		assert.equal(detail.mainExtrasHours, 103.77);
		assert.equal(detail.completionistHours, 175.26);
	});

	void it("returns null for missing, negative or garbage durations", async () => {
		const { client } = clientRespondingWith(
			htmlResponse(
				withGameFields(
					WITCHER_3_PAGE,
					{
						comp_plus: -50,
						comp_100: "lots",
						release_world: "0000-00-00"
					},
					["comp_main"]
				)
			)
		);

		const detail = await client.getGameById("10270");

		assert.equal(detail.mainStoryHours, null);
		assert.equal(detail.mainExtrasHours, null);
		assert.equal(detail.completionistHours, null);
		assert.equal(detail.releaseYear, 2015);
	});

	void it("converts seconds to hours rounded to two decimals, accepting numeric strings and dropping values that round to zero", async () => {
		const { client } = clientRespondingWith(
			htmlResponse(
				withGameFields(WITCHER_3_PAGE, {
					comp_main: 1,
					comp_plus: "5400",
					comp_100: 3600.5
				})
			)
		);

		const detail = await client.getGameById("10270");

		assert.equal(detail.mainStoryHours, null);
		assert.equal(detail.mainExtrasHours, 1.5);
		assert.equal(detail.completionistHours, 1);
	});

	void it("returns a null release year when every release date is unknown", async () => {
		const { client } = clientRespondingWith(
			htmlResponse(
				withGameFields(WITCHER_3_PAGE, {
					release_world: "0000-00-00",
					release_na: "",
					release_eu: null,
					release_jp: "TBA"
				})
			)
		);

		assert.equal((await client.getGameById("10270")).releaseYear, null);
	});

	void it("falls back to the requested id when the page id is unusable", async () => {
		const { client } = clientRespondingWith(
			htmlResponse(withGameFields(WITCHER_3_PAGE, { game_id: "abc" }))
		);

		assert.equal((await client.getGameById("10270")).id, "10270");
	});
});

void describe("HltbClient.getGameById structure errors", () => {
	const brokenPages: [string, string][] = [
		[
			"an HTML page without __NEXT_DATA__",
			"<html><body><h1>Hello</h1></body></html>"
		],
		["an empty body", ""],
		["truncated HTML", WITCHER_3_PAGE.slice(0, 2000)],
		[
			"invalid JSON in __NEXT_DATA__",
			withNextData(WITCHER_3_PAGE, '{"props":{"pageProps":')
		],
		[
			"__NEXT_DATA__ that is not an object",
			withNextData(WITCHER_3_PAGE, "[1,2,3]")
		],
		[
			"__NEXT_DATA__ without game data",
			withNextData(WITCHER_3_PAGE, '{"props":{"pageProps":{}}}')
		],
		[
			"a game without title",
			withGameFields(WITCHER_3_PAGE, { game_name: "   " })
		],
		[
			"a game entry that is not an object",
			withNextData(
				WITCHER_3_PAGE,
				'{"props":{"pageProps":{"game":{"data":{"game":["x"]}}}}}'
			)
		]
	];

	for (const [name, html] of brokenPages) {
		void it(`${name} fails as HLTB_PARSE_ERROR`, async () => {
			const { client } = clientRespondingWith(htmlResponse(html));

			await expectCode(client.getGameById("10270"), "HLTB_PARSE_ERROR");
		});
	}

	void it("an empty game list fails as HLTB_NOT_FOUND", async () => {
		const { client } = clientRespondingWith(
			htmlResponse(
				withNextData(
					WITCHER_3_PAGE,
					'{"props":{"pageProps":{"game":{"data":{"game":[]}}}}}'
				)
			)
		);

		await expectCode(client.getGameById("10270"), "HLTB_NOT_FOUND");
	});

	void it("the Next.js 404 page served with 200 fails as HLTB_NOT_FOUND", async () => {
		const { client } = clientRespondingWith(
			htmlResponse(NOT_FOUND_PAGE, 200)
		);

		await expectCode(client.getGameById("999999999"), "HLTB_NOT_FOUND");
	});
});

void describe("HltbClient.getGameById request errors", () => {
	void it("404 fails as HLTB_NOT_FOUND", async () => {
		const { client } = clientRespondingWith(
			htmlResponse(NOT_FOUND_PAGE, 404)
		);

		await expectCode(client.getGameById("999999999"), "HLTB_NOT_FOUND");
	});

	for (const garbage of [
		"",
		"   ",
		"abc",
		"10270/../api",
		"-1",
		"1.5",
		"10270?x=1"
	]) {
		void it(`the id ${JSON.stringify(garbage)} fails as HLTB_NOT_FOUND without any request`, async () => {
			const { client, calls } = clientRespondingWith();

			await expectCode(client.getGameById(garbage), "HLTB_NOT_FOUND");
			assert.equal(calls.length, 0);
		});
	}

	void it("persistent 429 fails as HLTB_RATE_LIMITED keeping the request detail", async () => {
		const { client, calls } = clientRespondingWith(
			htmlResponse("", 429, { "Retry-After": "2" }),
			htmlResponse("", 429)
		);

		const error = await expectCode(
			client.getGameById("10270"),
			"HLTB_RATE_LIMITED"
		);

		assert.equal(calls.length, 2);
		assert.deepEqual(error.serviceError.raw, {
			kind: "RATE_LIMITED",
			url: "https://howlongtobeat.com/game/10270",
			status: 429,
			attempts: 2,
			retryAfterMs: undefined
		});
	});

	void it("429 then success returns the detail", async () => {
		const { client } = clientRespondingWith(
			htmlResponse("", 429),
			htmlResponse(WITCHER_3_PAGE)
		);

		assert.equal(
			(await client.getGameById("10270")).title,
			"The Witcher 3: Wild Hunt"
		);
	});

	void it("403 from the CDN fails as HLTB_BLOCKED", async () => {
		const { client, calls } = clientRespondingWith(
			htmlResponse("<title>403 Unavailable (IFW-U01)</title>", 403)
		);

		await expectCode(client.getGameById("10270"), "HLTB_BLOCKED");
		assert.equal(calls.length, 1);
	});

	void it("a challenge page fails as HLTB_BLOCKED", async () => {
		const { client } = clientRespondingWith(
			htmlResponse(
				"<html><head><title>Just a moment...</title></head></html>"
			)
		);

		await expectCode(client.getGameById("10270"), "HLTB_BLOCKED");
	});

	void it("persistent 5xx fails as HLTB_REQUEST_ERROR", async () => {
		const { client } = clientRespondingWith(
			htmlResponse("", 500),
			htmlResponse("", 503)
		);

		await expectCode(client.getGameById("10270"), "HLTB_REQUEST_ERROR");
	});

	void it("a network failure fails as HLTB_REQUEST_ERROR", async () => {
		const { client } = clientRespondingWith(
			new TypeError("fetch failed"),
			new TypeError("fetch failed")
		);

		await expectCode(client.getGameById("10270"), "HLTB_REQUEST_ERROR");
	});

	void it("a request that never answers fails as HLTB_TIMEOUT", async () => {
		const clock = createFakeClock();
		const client = new HltbClient(
			buildClient(clock, fetchThatHangsUntilAborted(), { maxRetries: 0 })
		);

		await expectCode(client.getGameById("10270"), "HLTB_TIMEOUT");
	});

	void it("an aborted interactive request fails as HLTB_ABORTED without retrying", async () => {
		const clock = createFakeClock();
		let attempts = 0;
		const hanging = fetchThatHangsUntilAborted();
		const client = new HltbClient(
			buildClient(
				clock,
				(url, init) => {
					attempts += 1;
					return hanging(url, init);
				},
				{ timeoutMs: 60_000 }
			)
		);
		const controller = new AbortController();

		const pending = client.getGameById("10270", {
			priority: "interactive",
			signal: controller.signal
		});
		await new Promise(resolve => setImmediate(resolve));
		controller.abort();

		await expectCode(pending, "HLTB_ABORTED");
		assert.equal(attempts, 1);
	});

	void it("a double click asks twice in order without overlapping requests", async () => {
		const { client, calls } = clientRespondingWith(
			htmlResponse(WITCHER_3_PAGE),
			htmlResponse(WITCHER_3_PAGE)
		);

		const [first, second] = await Promise.all([
			client.getGameById("10270"),
			client.getGameById("10270")
		]);

		assert.deepEqual(first, second);
		assert.equal(calls.length, 2);
		assert.ok(calls[1]!.at - calls[0]!.at >= 5000);
	});
});
