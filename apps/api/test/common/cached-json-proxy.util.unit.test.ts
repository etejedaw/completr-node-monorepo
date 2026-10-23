import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import { createCachedJsonProxy } from "../../src/common/utils/cached-json-proxy.util";
import { fakeRequest, fakeResponse } from "../unit-helpers/http-fakes";

const SOURCE_URL = "https://example.com/data.json";
const UNAVAILABLE_MESSAGE = "Source unavailable";
const CACHE_TTL_MS = 5 * 60 * 1000;

function createProxy() {
	return createCachedJsonProxy({
		sourceUrl: SOURCE_URL,
		unavailableMessage: UNAVAILABLE_MESSAGE
	});
}

async function callProxy(proxy: ReturnType<typeof createProxy>) {
	const { response, captured } = fakeResponse();
	await proxy(fakeRequest(), response);
	return captured;
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" }
	});
}

function stubFetch(implementation: (...args: unknown[]) => Promise<Response>) {
	return mock.method(globalThis, "fetch", implementation as typeof fetch);
}

void describe("createCachedJsonProxy", () => {
	beforeEach(() => {
		mock.timers.enable({ apis: ["Date"], now: 1_000_000 });
	});

	afterEach(() => {
		mock.timers.reset();
		mock.restoreAll();
	});

	void it("fetches the source on the first request and answers 200 with its body", async () => {
		const fetchMock = stubFetch(async () => jsonResponse({ version: 1 }));

		const captured = await callProxy(createProxy());

		assert.equal(captured.status, 200);
		assert.deepEqual(captured.body, { version: 1 });
		assert.equal(fetchMock.mock.callCount(), 1);
		const [url, init] = fetchMock.mock.calls[0]?.arguments as [
			string,
			RequestInit
		];
		assert.equal(url, SOURCE_URL);
		assert.deepEqual(init.headers, { Accept: "application/json" });
		assert.ok(init.signal instanceof AbortSignal);
	});

	void it("serves the cached body without fetching again within the TTL", async () => {
		const fetchMock = stubFetch(async () => jsonResponse({ version: 1 }));
		const proxy = createProxy();
		await callProxy(proxy);

		mock.timers.tick(CACHE_TTL_MS - 1);
		const captured = await callProxy(proxy);

		assert.equal(captured.status, 200);
		assert.deepEqual(captured.body, { version: 1 });
		assert.equal(fetchMock.mock.callCount(), 1);
	});

	void it("refreshes the body once the TTL has expired", async () => {
		let version = 0;
		const fetchMock = stubFetch(async () =>
			jsonResponse({ version: ++version })
		);
		const proxy = createProxy();
		await callProxy(proxy);

		mock.timers.tick(CACHE_TTL_MS);
		const captured = await callProxy(proxy);

		assert.deepEqual(captured.body, { version: 2 });
		assert.equal(fetchMock.mock.callCount(), 2);
	});

	void it("restarts the TTL after a refresh", async () => {
		let version = 0;
		const fetchMock = stubFetch(async () =>
			jsonResponse({ version: ++version })
		);
		const proxy = createProxy();
		await callProxy(proxy);
		mock.timers.tick(CACHE_TTL_MS);
		await callProxy(proxy);

		mock.timers.tick(CACHE_TTL_MS - 1);
		const captured = await callProxy(proxy);

		assert.deepEqual(captured.body, { version: 2 });
		assert.equal(fetchMock.mock.callCount(), 2);
	});

	void it("keeps independent caches per proxy", async () => {
		const fetchMock = stubFetch(async () => jsonResponse({ ok: true }));

		await callProxy(createProxy());
		await callProxy(createProxy());

		assert.equal(fetchMock.mock.callCount(), 2);
	});

	void it("shares a single in-flight request between concurrent calls", async () => {
		const fetchMock = stubFetch(async () => jsonResponse({ version: 1 }));
		const proxy = createProxy();

		const [first, second] = await Promise.all([
			callProxy(proxy),
			callProxy(proxy)
		]);

		assert.equal(fetchMock.mock.callCount(), 1);
		assert.deepEqual(first.body, { version: 1 });
		assert.deepEqual(second.body, { version: 1 });
	});

	void it("answers 503 with the unavailable message when the source fails and there is no cache", async () => {
		stubFetch(async () => {
			throw new TypeError("fetch failed");
		});

		const captured = await callProxy(createProxy());

		assert.equal(captured.status, 503);
		assert.deepEqual(captured.body, { error: UNAVAILABLE_MESSAGE });
	});

	void it("serves the stale cache when the source fails after the TTL", async () => {
		let shouldFail = false;
		stubFetch(async () => {
			if (shouldFail) throw new TypeError("fetch failed");
			return jsonResponse({ version: 1 });
		});
		const proxy = createProxy();
		await callProxy(proxy);

		shouldFail = true;
		mock.timers.tick(CACHE_TTL_MS + 1);
		const captured = await callProxy(proxy);

		assert.equal(captured.status, 200);
		assert.deepEqual(captured.body, { version: 1 });
	});

	void it("answers 503 when the source returns a non-ok status and there is no cache", async () => {
		stubFetch(async () => jsonResponse({ error: "boom" }, 500));

		const captured = await callProxy(createProxy());

		assert.equal(captured.status, 503);
		assert.deepEqual(captured.body, { error: UNAVAILABLE_MESSAGE });
	});

	void it("serves the stale cache when the source returns a non-ok status after the TTL", async () => {
		let status = 200;
		stubFetch(async () => jsonResponse({ version: 1 }, status));
		const proxy = createProxy();
		await callProxy(proxy);

		status = 502;
		mock.timers.tick(CACHE_TTL_MS + 1);
		const captured = await callProxy(proxy);

		assert.equal(captured.status, 200);
		assert.deepEqual(captured.body, { version: 1 });
	});

	void it("answers 503 when the source returns invalid JSON and there is no cache", async () => {
		stubFetch(
			async () => new Response("<html>not json</html>", { status: 200 })
		);

		const captured = await callProxy(createProxy());

		assert.equal(captured.status, 503);
		assert.deepEqual(captured.body, { error: UNAVAILABLE_MESSAGE });
	});

	void it("serves the stale cache when the source returns invalid JSON after the TTL", async () => {
		let invalid = false;
		stubFetch(async () =>
			invalid
				? new Response("not json", { status: 200 })
				: jsonResponse({ version: 1 })
		);
		const proxy = createProxy();
		await callProxy(proxy);

		invalid = true;
		mock.timers.tick(CACHE_TTL_MS + 1);
		const captured = await callProxy(proxy);

		assert.equal(captured.status, 200);
		assert.deepEqual(captured.body, { version: 1 });
	});

	void it("recovers on the next request after a failure with no cache", async () => {
		let shouldFail = true;
		const fetchMock = stubFetch(async () => {
			if (shouldFail) throw new TypeError("fetch failed");
			return jsonResponse({ version: 1 });
		});
		const proxy = createProxy();
		await callProxy(proxy);

		shouldFail = false;
		const captured = await callProxy(proxy);

		assert.equal(captured.status, 200);
		assert.deepEqual(captured.body, { version: 1 });
		assert.equal(fetchMock.mock.callCount(), 2);
	});
});
