import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ScrapingRequestError } from "../../src/scraping/errors/scraping-request.error";
import { type ScrapingSleep } from "../../src/scraping/scraping.types";
import { captureRejection } from "../unit-helpers/mocks";
import {
	buildClient,
	createFakeClock,
	deferred,
	fetchThatHangsUntilAborted,
	htmlResponse,
	MIN_DELAY_MS,
	scriptedFetch
} from "./scraping-fakes";

const PAGE_A = new URL("https://howlongtobeat.com/game/1");
const PAGE_B = new URL("https://howlongtobeat.com/game/2");
const PAGE_C = new URL("https://howlongtobeat.com/game/3");
const PAGE_D = new URL("https://howlongtobeat.com/game/4");
const RETRY_BASE_DELAY_MS = 10_000;

function assertAborted(error: unknown) {
	assert.ok(error instanceof ScrapingRequestError, `got ${String(error)}`);
	assert.equal(error.kind, "ABORTED");
	return error;
}

function nextMacrotask() {
	return new Promise(resolve => setImmediate(resolve));
}

async function until(condition: () => boolean) {
	for (let tries = 0; tries < 200 && !condition(); tries += 1)
		await nextMacrotask();
	assert.ok(condition(), "condition never became true");
}

function manualSleep(clock: ReturnType<typeof createFakeClock>) {
	const pending: { milliseconds: number; finish: () => void }[] = [];
	const sleep: ScrapingSleep = (milliseconds, signal) =>
		new Promise(resolve => {
			const entry = {
				milliseconds,
				finish: () => {
					clock.advance(milliseconds);
					resolve();
				}
			};
			pending.push(entry);
			signal?.addEventListener(
				"abort",
				() => {
					pending.splice(pending.indexOf(entry), 1);
					resolve();
				},
				{ once: true }
			);
		});
	return { sleep, pending };
}

void describe("ScrapingHttpClient priority", () => {
	void it("an interactive request jumps ahead of queued background ones without cutting the request in flight", async () => {
		const clock = createFakeClock();
		const first = deferred<Response>();
		const { fetch, calls } = scriptedFetch(clock, [
			() => first.promise,
			htmlResponse("interactive"),
			htmlResponse("background b"),
			htmlResponse("background c")
		]);
		const client = buildClient(clock, fetch);

		const inFlight = client.getHtml(PAGE_A);
		await nextMacrotask();
		const queuedB = client.getHtml(PAGE_B);
		const queuedC = client.getHtml(PAGE_C);
		const interactive = client.getHtml(PAGE_D, {
			priority: "interactive"
		});
		await nextMacrotask();

		assert.equal(calls.length, 1);
		first.resolve(htmlResponse("in flight"));

		assert.deepEqual(
			await Promise.all([inFlight, interactive, queuedB, queuedC]),
			["in flight", "interactive", "background b", "background c"]
		);
		assert.deepEqual(
			calls.map(call => call.url),
			[PAGE_A, PAGE_D, PAGE_B, PAGE_C].map(String)
		);
		assert.equal(calls[1]!.at - calls[0]!.at, MIN_DELAY_MS);
		assert.equal(calls[2]!.at - calls[1]!.at, MIN_DELAY_MS);
	});

	void it("an interactive request still waits the minimum delay since the last request to the host", async () => {
		const clock = createFakeClock();
		const { fetch, calls } = scriptedFetch(clock, [
			htmlResponse("a"),
			htmlResponse("b")
		]);
		const client = buildClient(clock, fetch);

		await client.getHtml(PAGE_A);
		clock.advance(1000);
		await client.getHtml(PAGE_B, { priority: "interactive" });

		assert.equal(calls[1]!.at - calls[0]!.at, MIN_DELAY_MS);
	});

	void it("interactive requests keep their arrival order among themselves", async () => {
		const clock = createFakeClock();
		const first = deferred<Response>();
		const { fetch, calls } = scriptedFetch(clock, [
			() => first.promise,
			htmlResponse("b"),
			htmlResponse("c")
		]);
		const client = buildClient(clock, fetch);

		const inFlight = client.getHtml(PAGE_A);
		await nextMacrotask();
		const pending = [
			inFlight,
			client.getHtml(PAGE_B, { priority: "interactive" }),
			client.getHtml(PAGE_C, { priority: "interactive" })
		];
		await nextMacrotask();
		first.resolve(htmlResponse("a"));
		await Promise.all(pending);

		assert.deepEqual(
			calls.map(call => call.url),
			[PAGE_A, PAGE_B, PAGE_C].map(String)
		);
	});

	void it("a background retry backoff does not hold back an interactive request", async () => {
		const clock = createFakeClock();
		const first = deferred<Response>();
		const { fetch, calls } = scriptedFetch(clock, [
			() => first.promise,
			htmlResponse("interactive"),
			htmlResponse("retried")
		]);
		const client = buildClient(clock, fetch);

		const background = client.getHtml(PAGE_A);
		await nextMacrotask();
		const interactive = client.getHtml(PAGE_B, {
			priority: "interactive"
		});
		first.resolve(htmlResponse("oops", 502));

		assert.equal(await interactive, "interactive");
		assert.equal(await background, "retried");
		assert.deepEqual(
			calls.map(call => call.url),
			[PAGE_A, PAGE_B, PAGE_A].map(String)
		);
		assert.equal(calls[1]!.at - calls[0]!.at, MIN_DELAY_MS);
		assert.equal(calls[2]!.at - calls[0]!.at, RETRY_BASE_DELAY_MS);
	});

	void it("an interactive request arriving during a background backoff wakes the queue instead of waiting it out", async () => {
		const clock = createFakeClock();
		const { sleep, pending } = manualSleep(clock);
		const { fetch, calls } = scriptedFetch(clock, [
			htmlResponse("oops", 502),
			htmlResponse("interactive"),
			htmlResponse("retried")
		]);
		const client = buildClient(clock, fetch, { sleep });

		const background = client.getHtml(PAGE_A);
		await until(() => pending.length === 1);
		assert.equal(pending[0]!.milliseconds, RETRY_BASE_DELAY_MS);

		clock.advance(MIN_DELAY_MS);
		const interactive = client.getHtml(PAGE_B, {
			priority: "interactive"
		});

		assert.equal(await interactive, "interactive");
		assert.equal(calls[1]!.at - calls[0]!.at, MIN_DELAY_MS);

		await until(() => pending.length === 1);
		pending[0]!.finish();

		assert.equal(await background, "retried");
		assert.equal(calls[2]!.at - calls[0]!.at, RETRY_BASE_DELAY_MS);
	});

	void it("a 429 without Retry-After slows the whole host, interactive requests included", async () => {
		const clock = createFakeClock();
		const first = deferred<Response>();
		const { fetch, calls } = scriptedFetch(clock, [
			() => first.promise,
			htmlResponse("interactive"),
			htmlResponse("retried")
		]);
		const client = buildClient(clock, fetch);

		const background = client.getHtml(PAGE_A);
		await nextMacrotask();
		const interactive = client.getHtml(PAGE_B, {
			priority: "interactive"
		});
		first.resolve(htmlResponse("slow down", 429));

		assert.equal(await interactive, "interactive");
		assert.equal(await background, "retried");
		assert.equal(calls[1]!.at - calls[0]!.at, RETRY_BASE_DELAY_MS);
	});
});

void describe("ScrapingHttpClient cancellation", () => {
	void it("an already aborted signal rejects without touching the network", async () => {
		const clock = createFakeClock();
		const { fetch, calls } = scriptedFetch(clock, []);
		const controller = new AbortController();
		controller.abort();

		const error = await captureRejection(
			buildClient(clock, fetch).getHtml(PAGE_A, {
				signal: controller.signal
			})
		);

		assert.equal(assertAborted(error).detail.attempts, 0);
		assert.equal(calls.length, 0);
	});

	void it("aborting a queued request takes it out of the queue without requesting it", async () => {
		const clock = createFakeClock();
		const first = deferred<Response>();
		const { fetch, calls } = scriptedFetch(clock, [
			() => first.promise,
			htmlResponse("c")
		]);
		const client = buildClient(clock, fetch);
		const controller = new AbortController();

		const inFlight = client.getHtml(PAGE_A);
		const aborted = client.getHtml(PAGE_B, { signal: controller.signal });
		const next = client.getHtml(PAGE_C);
		await nextMacrotask();

		controller.abort();
		const error = await captureRejection(aborted);
		first.resolve(htmlResponse("a"));

		assert.equal(assertAborted(error).detail.attempts, 0);
		assert.deepEqual(await Promise.all([inFlight, next]), ["a", "c"]);
		assert.deepEqual(
			calls.map(call => call.url),
			[PAGE_A, PAGE_C].map(String)
		);
		assert.equal(calls[1]!.at - calls[0]!.at, MIN_DELAY_MS);
	});

	void it("aborting a request in flight aborts the fetch, is not retried and keeps the host throttled", async () => {
		const clock = createFakeClock();
		const hanging = fetchThatHangsUntilAborted();
		const calls: { url: string; at: number }[] = [];
		const client = buildClient(
			clock,
			async (url, init) => {
				calls.push({ url, at: clock.now() });
				return url === PAGE_A.toString()
					? await hanging(url, init)
					: htmlResponse("next");
			},
			{ timeoutMs: 60_000 }
		);
		const controller = new AbortController();

		const aborted = client.getHtml(PAGE_A, {
			priority: "interactive",
			signal: controller.signal
		});
		await until(() => calls.length === 1);
		clock.advance(2000);
		controller.abort();

		const error = await captureRejection(aborted);
		const failure = assertAborted(error);
		assert.equal(failure.detail.attempts, 1);
		assert.equal(calls.length, 1);

		assert.equal(await client.getHtml(PAGE_B), "next");
		assert.equal(calls[1]!.at - calls[0]!.at, 2000 + MIN_DELAY_MS);
	});

	void it("aborting a request waiting for its retry drops the retry and frees the queue", async () => {
		const clock = createFakeClock();
		const { sleep, pending } = manualSleep(clock);
		const { fetch, calls } = scriptedFetch(clock, [
			htmlResponse("oops", 503),
			htmlResponse("next")
		]);
		const client = buildClient(clock, fetch, { sleep });
		const controller = new AbortController();

		const aborted = client.getHtml(PAGE_A, { signal: controller.signal });
		await until(() => pending.length === 1);
		controller.abort();

		const error = await captureRejection(aborted);
		assert.equal(assertAborted(error).detail.attempts, 1);
		assert.equal(pending.length, 0);

		clock.advance(MIN_DELAY_MS);
		assert.equal(await client.getHtml(PAGE_B), "next");
		assert.equal(calls.length, 2);
	});

	void it("aborting after the response arrived does not affect a request that already settled", async () => {
		const clock = createFakeClock();
		const { fetch } = scriptedFetch(clock, [htmlResponse("done")]);
		const controller = new AbortController();

		const body = await buildClient(clock, fetch).getHtml(PAGE_A, {
			signal: controller.signal
		});
		controller.abort();

		assert.equal(body, "done");
	});
});
