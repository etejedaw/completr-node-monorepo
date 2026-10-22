import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { ServiceError } from "../../src/common/errors/service-error";
import {
	DisabledRawgProvider,
	RawgClient,
	RawgProvider
} from "../../src/rawg/rawg.provider";
import { captureRejection } from "../unit-helpers/mocks";
import {
	ELDEN_RING_DETAIL,
	SEARCH_RESPONSE,
	UNRATED_DETAIL
} from "./fixtures/rawg.fixtures";
import { jsonResponse } from "./rawg-fetch.helper";

const API_KEY = "fake-key";
const RAWG_GAMES_URL = "https://api.rawg.io/api/games";

function stubFetch(implementation: () => Promise<Response>) {
	return mock.method(globalThis, "fetch", implementation as typeof fetch);
}

function stubFetchWith(response: Response) {
	return stubFetch(async () => response);
}

function requestedUrl(fetchMock: ReturnType<typeof stubFetch>, call = 0) {
	const input = fetchMock.mock.calls[call]?.arguments[0];
	assert.ok(input, "fetch was not called");
	return new URL(String(input));
}

function assertServiceError(error: unknown, code: string) {
	assert.ok(error instanceof ServiceError);
	assert.equal(error.code, code);
	assert.equal(error.serviceError.service, "RAWG Provider");
	return error;
}

afterEach(() => {
	mock.restoreAll();
});

void describe("RawgClient.create", () => {
	void it("returns a DisabledRawgProvider when there is no API key", () => {
		const client = RawgClient.create(undefined);

		assert.ok(client instanceof DisabledRawgProvider);
		assert.equal(client.isEnabled, false);
	});

	void it("returns a DisabledRawgProvider when the API key is empty", () => {
		const client = RawgClient.create("");

		assert.ok(client instanceof DisabledRawgProvider);
		assert.equal(client.isEnabled, false);
	});

	void it("returns a RawgProvider when there is an API key", () => {
		const client = RawgClient.create(API_KEY);

		assert.ok(client instanceof RawgProvider);
		assert.equal(client.isEnabled, true);
	});
});

void describe("DisabledRawgProvider", () => {
	const provider = new DisabledRawgProvider();

	const methods: [string, () => unknown][] = [
		["searchGame", () => provider.searchGame()],
		["getGameById", () => provider.getGameById()],
		["getGameBySlug", () => provider.getGameBySlug()]
	];

	for (const [name, call] of methods) {
		void it(`${name} throws RAWG_DISABLED`, () => {
			assert.throws(call, error => {
				assertServiceError(error, "RAWG_DISABLED");
				return true;
			});
		});
	}

	void it("never calls fetch", () => {
		const fetchMock = stubFetchWith(jsonResponse({}));

		assert.throws(() => provider.searchGame());

		assert.equal(fetchMock.mock.callCount(), 0);
	});
});

void describe("RawgProvider.searchGame", () => {
	const provider = new RawgProvider(API_KEY);

	void it("builds the search URL with the key, the query and the default page size", async () => {
		const fetchMock = stubFetchWith(jsonResponse(SEARCH_RESPONSE));

		await provider.searchGame("elden ring");

		assert.equal(fetchMock.mock.callCount(), 1);
		const url = requestedUrl(fetchMock);
		assert.equal(`${url.origin}${url.pathname}`, RAWG_GAMES_URL);
		assert.equal(url.searchParams.get("key"), API_KEY);
		assert.equal(url.searchParams.get("search"), "elden ring");
		assert.equal(url.searchParams.get("search_precise"), "true");
		assert.equal(url.searchParams.get("page_size"), "5");
		assert.deepEqual([...url.searchParams.keys()].sort(), [
			"key",
			"page_size",
			"search",
			"search_precise"
		]);
	});

	void it("encodes special characters of the query", async () => {
		const fetchMock = stubFetchWith(jsonResponse(SEARCH_RESPONSE));

		await provider.searchGame("pokémon & friends/100%");

		const url = requestedUrl(fetchMock);
		assert.equal(url.searchParams.get("search"), "pokémon & friends/100%");
		assert.equal(url.pathname, "/api/games");
	});

	void it("sends the requested page size instead of the default", async () => {
		const fetchMock = stubFetchWith(jsonResponse(SEARCH_RESPONSE));

		await provider.searchGame("elden ring", { page_size: 10 });

		assert.equal(
			requestedUrl(fetchMock).searchParams.get("page_size"),
			"10"
		);
	});

	void it("forwards every defined filter as a query param", async () => {
		const fetchMock = stubFetchWith(jsonResponse(SEARCH_RESPONSE));

		await provider.searchGame("elden ring", {
			page_size: 3,
			dates: "2022-01-01,2022-12-31",
			platforms: "187,186",
			genres: "4,5",
			metacritic: "80,100",
			ordering: "-rating",
			search_exact: true,
			exclude_additions: false
		});

		const { searchParams } = requestedUrl(fetchMock);
		assert.equal(searchParams.get("page_size"), "3");
		assert.equal(searchParams.get("dates"), "2022-01-01,2022-12-31");
		assert.equal(searchParams.get("platforms"), "187,186");
		assert.equal(searchParams.get("genres"), "4,5");
		assert.equal(searchParams.get("metacritic"), "80,100");
		assert.equal(searchParams.get("ordering"), "-rating");
		assert.equal(searchParams.get("search_exact"), "true");
		assert.equal(searchParams.get("exclude_additions"), "false");
	});

	void it("omits the filters that are undefined", async () => {
		const fetchMock = stubFetchWith(jsonResponse(SEARCH_RESPONSE));

		await provider.searchGame("elden ring", {
			ordering: undefined,
			genres: undefined,
			exclude_additions: true
		});

		const { searchParams } = requestedUrl(fetchMock);
		assert.equal(searchParams.has("ordering"), false);
		assert.equal(searchParams.has("genres"), false);
		assert.equal(searchParams.get("exclude_additions"), "true");
	});

	void it("returns the results of the response without touching the pagination envelope", async () => {
		stubFetchWith(jsonResponse(SEARCH_RESPONSE));

		const results = await provider.searchGame("elden ring");

		assert.deepEqual(results, SEARCH_RESPONSE.results);
		const [first] = results;
		assert.equal(first?.id, 326243);
		assert.equal(first?.slug, "elden-ring");
		assert.equal(first?.name, "Elden Ring");
		assert.equal(first?.released, "2022-02-25");
		assert.equal(first?.metacritic, 96);
		assert.equal(first?.playtime, 55);
		assert.deepEqual(
			first?.platforms.map(wrapper => wrapper.platform.slug),
			["playstation5", "xbox-series-x"]
		);
	});

	void it("returns an empty list when RAWG finds nothing", async () => {
		stubFetchWith(jsonResponse({ count: 0, next: null, results: [] }));

		assert.deepEqual(await provider.searchGame("zzzz"), []);
	});

	void it("keeps the nullable fields of a result as null", async () => {
		stubFetchWith(
			jsonResponse({ count: 1, next: null, results: [UNRATED_DETAIL] })
		);

		const [result] = await provider.searchGame("obscure prototype");

		assert.equal(result?.released, null);
		assert.equal(result?.background_image, null);
		assert.equal(result?.metacritic, null);
	});

	void it("fails with RAWG_NOT_FOUND on a 404", async () => {
		stubFetchWith(jsonResponse({ detail: "Not found." }, 404));

		const error = await captureRejection(provider.searchGame("x"));

		assertServiceError(error, "RAWG_NOT_FOUND");
	});

	void it("fails with RAWG_RATE_LIMITED on a 429", async () => {
		stubFetchWith(jsonResponse({ detail: "Throttled" }, 429));

		const error = await captureRejection(provider.searchGame("x"));

		assertServiceError(error, "RAWG_RATE_LIMITED");
	});

	for (const status of [400, 401, 500, 502, 503]) {
		void it(`fails with RAWG_REQUEST_ERROR on a ${status}`, async () => {
			stubFetchWith(
				new Response("upstream failure", {
					status,
					statusText: "Upstream Failure"
				})
			);

			const error = await captureRejection(provider.searchGame("x"));

			const serviceError = assertServiceError(
				error,
				"RAWG_REQUEST_ERROR"
			);
			assert.equal(
				serviceError.serviceError.raw,
				`RAWG API returned ${status}: Upstream Failure`
			);
		});
	}

	void it("rejects with the original SyntaxError when the body is not valid JSON", async () => {
		stubFetchWith(new Response("<html>gateway</html>", { status: 200 }));

		const error = await captureRejection(provider.searchGame("x"));

		assert.ok(error instanceof SyntaxError);
	});

	void it("rejects with the original error when the network fails", async () => {
		const networkFailure = new TypeError("fetch failed");
		stubFetch(async () => {
			throw networkFailure;
		});

		const error = await captureRejection(provider.searchGame("x"));

		assert.equal(error, networkFailure);
	});
});

void describe("RawgProvider.getGameById", () => {
	const provider = new RawgProvider(API_KEY);

	void it("requests the game by id with the key", async () => {
		const fetchMock = stubFetchWith(jsonResponse(ELDEN_RING_DETAIL));

		await provider.getGameById(326243);

		assert.equal(fetchMock.mock.callCount(), 1);
		const url = requestedUrl(fetchMock);
		assert.equal(
			`${url.origin}${url.pathname}`,
			`${RAWG_GAMES_URL}/326243`
		);
		assert.equal(url.searchParams.get("key"), API_KEY);
		assert.deepEqual([...url.searchParams.keys()], ["key"]);
	});

	void it("returns the detail with the fields of RawgGameDetail", async () => {
		stubFetchWith(jsonResponse(ELDEN_RING_DETAIL));

		const detail = await provider.getGameById(326243);

		assert.deepEqual(detail, ELDEN_RING_DETAIL);
		assert.equal(detail.description_raw, ELDEN_RING_DETAIL.description_raw);
		assert.equal(detail.website, ELDEN_RING_DETAIL.website);
	});

	void it("keeps a null description and website as null", async () => {
		stubFetchWith(jsonResponse(UNRATED_DETAIL));

		const detail = await provider.getGameById(UNRATED_DETAIL.id);

		assert.equal(detail.description_raw, null);
		assert.equal(detail.website, null);
	});

	void it("fails with RAWG_NOT_FOUND on a 404", async () => {
		stubFetchWith(jsonResponse({ detail: "Not found." }, 404));

		const error = await captureRejection(provider.getGameById(1));

		assertServiceError(error, "RAWG_NOT_FOUND");
	});

	void it("fails with RAWG_RATE_LIMITED on a 429", async () => {
		stubFetchWith(jsonResponse({ detail: "Throttled" }, 429));

		const error = await captureRejection(provider.getGameById(1));

		assertServiceError(error, "RAWG_RATE_LIMITED");
	});

	void it("fails with RAWG_REQUEST_ERROR on a 5xx", async () => {
		stubFetchWith(new Response("boom", { status: 500 }));

		const error = await captureRejection(provider.getGameById(1));

		assertServiceError(error, "RAWG_REQUEST_ERROR");
	});

	void it("rejects with the original SyntaxError when the body is not valid JSON", async () => {
		stubFetchWith(new Response("not json", { status: 200 }));

		const error = await captureRejection(provider.getGameById(1));

		assert.ok(error instanceof SyntaxError);
	});

	void it("rejects with the original error when the network fails", async () => {
		const networkFailure = new TypeError("fetch failed");
		stubFetch(async () => {
			throw networkFailure;
		});

		const error = await captureRejection(provider.getGameById(1));

		assert.equal(error, networkFailure);
	});
});

void describe("RawgProvider.getGameBySlug", () => {
	const provider = new RawgProvider(API_KEY);

	void it("requests the game by slug with the key", async () => {
		const fetchMock = stubFetchWith(jsonResponse(ELDEN_RING_DETAIL));

		await provider.getGameBySlug("elden-ring");

		assert.equal(fetchMock.mock.callCount(), 1);
		const url = requestedUrl(fetchMock);
		assert.equal(
			`${url.origin}${url.pathname}`,
			`${RAWG_GAMES_URL}/elden-ring`
		);
		assert.equal(url.searchParams.get("key"), API_KEY);
		assert.deepEqual([...url.searchParams.keys()], ["key"]);
	});

	void it("returns the detail with the fields of RawgGameDetail", async () => {
		stubFetchWith(jsonResponse(ELDEN_RING_DETAIL));

		const detail = await provider.getGameBySlug("elden-ring");

		assert.deepEqual(detail, ELDEN_RING_DETAIL);
	});

	void it("fails with RAWG_NOT_FOUND on a 404", async () => {
		stubFetchWith(jsonResponse({ detail: "Not found." }, 404));

		const error = await captureRejection(provider.getGameBySlug("missing"));

		assertServiceError(error, "RAWG_NOT_FOUND");
	});

	void it("fails with RAWG_RATE_LIMITED on a 429", async () => {
		stubFetchWith(jsonResponse({ detail: "Throttled" }, 429));

		const error = await captureRejection(provider.getGameBySlug("x"));

		assertServiceError(error, "RAWG_RATE_LIMITED");
	});

	void it("fails with RAWG_REQUEST_ERROR on a 5xx", async () => {
		stubFetchWith(new Response("boom", { status: 503 }));

		const error = await captureRejection(provider.getGameBySlug("x"));

		assertServiceError(error, "RAWG_REQUEST_ERROR");
	});

	void it("rejects with the original SyntaxError when the body is not valid JSON", async () => {
		stubFetchWith(new Response("not json", { status: 200 }));

		const error = await captureRejection(provider.getGameBySlug("x"));

		assert.ok(error instanceof SyntaxError);
	});

	void it("rejects with the original error when the network fails", async () => {
		const networkFailure = new TypeError("fetch failed");
		stubFetch(async () => {
			throw networkFailure;
		});

		const error = await captureRejection(provider.getGameBySlug("x"));

		assert.equal(error, networkFailure);
	});
});
