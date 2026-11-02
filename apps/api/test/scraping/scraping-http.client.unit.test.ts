import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ScrapingRequestError } from "../../src/scraping/errors/scraping-request.error";
import { SCRAPING_USER_AGENT } from "../../src/scraping/scraping.constants";
import { ScrapingHttpClient } from "../../src/scraping/scraping-http.client";
import { captureRejection } from "../unit-helpers/mocks";
import {
	buildClient,
	createFakeClock,
	deferred,
	fetchThatHangsUntilAborted,
	htmlResponse,
	JITTER_MS,
	MIN_DELAY_MS,
	scriptedFetch
} from "./scraping-fakes";

const PAGE_A = new URL("https://howlongtobeat.com/game/1");
const PAGE_B = new URL("https://howlongtobeat.com/game/2");
const OTHER_HOST_PAGE = new URL("https://www.metacritic.com/game/a/");

function assertFailure(error: unknown, kind: string) {
	assert.ok(error instanceof ScrapingRequestError, `got ${String(error)}`);
	assert.equal(error.kind, kind);
	return error;
}

void describe("ScrapingHttpClient requests", () => {
	void it("returns the body and identifies itself honestly", async () => {
		const clock = createFakeClock();
		const { fetch, calls } = scriptedFetch(clock, [
			htmlResponse("<p>ok</p>")
		]);

		const body = await buildClient(clock, fetch).getHtml(PAGE_A);

		assert.equal(body, "<p>ok</p>");
		assert.equal(calls.length, 1);
		const headers = new Headers(calls[0]!.init.headers);
		assert.equal(headers.get("User-Agent"), SCRAPING_USER_AGENT);
		assert.match(
			SCRAPING_USER_AGENT,
			/^CompletrBot\/[\d.]+ \(\+https:\/\/www\.completr\.app\)$/
		);
		assert.doesNotMatch(SCRAPING_USER_AGENT, /Mozilla|Chrome|Safari/);
		assert.equal(clock.sleeps.length, 0);
	});

	void it("the shared instance is created once", () => {
		assert.equal(ScrapingHttpClient.shared(), ScrapingHttpClient.shared());
	});

	void it("404 fails as NOT_FOUND without retrying", async () => {
		const clock = createFakeClock();
		const { fetch, calls } = scriptedFetch(clock, [
			htmlResponse("gone", 404)
		]);

		const error = await captureRejection(
			buildClient(clock, fetch).getHtml(PAGE_A)
		);

		assertFailure(error, "NOT_FOUND");
		assert.equal(calls.length, 1);
	});

	void it("403 fails as BLOCKED and is never retried", async () => {
		const clock = createFakeClock();
		const { fetch, calls } = scriptedFetch(clock, [
			htmlResponse("<h1>Error 403 Unavailable</h1>", 403),
			htmlResponse("<p>should not be requested</p>")
		]);

		const error = await captureRejection(
			buildClient(clock, fetch).getHtml(PAGE_A)
		);

		assert.equal(assertFailure(error, "BLOCKED").detail.status, 403);
		assert.equal(calls.length, 1);
	});

	for (const [name, response] of [
		[
			"a Cloudflare challenge served with 200",
			htmlResponse(
				"<html><head><title>Just a moment...</title></head></html>"
			)
		],
		[
			"a challenge flagged by the cf-mitigated header",
			htmlResponse("<html></html>", 200, { "cf-mitigated": "challenge" })
		],
		[
			"a 503 challenge page",
			htmlResponse('<form id="challenge-form"></form>', 503)
		],
		[
			"a DataDome CAPTCHA",
			htmlResponse(
				'<script src="https://ct.captcha-delivery.com/c.js"></script>'
			)
		],
		[
			"a reCAPTCHA widget",
			htmlResponse('<div class="g-recaptcha" data-sitekey="x"></div>')
		]
	] as const) {
		void it(`${name} fails as BLOCKED without retrying`, async () => {
			const clock = createFakeClock();
			const { fetch, calls } = scriptedFetch(clock, [
				response,
				htmlResponse("<p>ok</p>")
			]);

			const error = await captureRejection(
				buildClient(clock, fetch).getHtml(PAGE_A)
			);

			assertFailure(error, "BLOCKED");
			assert.equal(calls.length, 1);
		});
	}

	void it("a normal page that merely loads a recaptcha config is not BLOCKED", async () => {
		const clock = createFakeClock();
		const { fetch } = scriptedFetch(clock, [
			htmlResponse(
				"<script>recaptcha:{siteKey:'x'}</script><script src=\"/cdn-cgi/challenge-platform/scripts/jsd/main.js\"></script>"
			)
		]);

		const body = await buildClient(clock, fetch).getHtml(PAGE_A);

		assert.match(body, /recaptcha/);
	});

	void it("other 4xx statuses fail as REQUEST_ERROR without retrying", async () => {
		const clock = createFakeClock();
		const { fetch, calls } = scriptedFetch(clock, [
			htmlResponse("bad", 400)
		]);

		const error = await captureRejection(
			buildClient(clock, fetch).getHtml(PAGE_A)
		);

		assert.equal(assertFailure(error, "REQUEST_ERROR").detail.status, 400);
		assert.equal(calls.length, 1);
	});
});

void describe("ScrapingHttpClient retries", () => {
	void it("429 without Retry-After retries once after the backoff and succeeds", async () => {
		const clock = createFakeClock();
		const { fetch, calls } = scriptedFetch(clock, [
			htmlResponse("slow down", 429),
			htmlResponse("<p>ok</p>")
		]);

		const body = await buildClient(clock, fetch).getHtml(PAGE_A);

		assert.equal(body, "<p>ok</p>");
		assert.equal(calls.length, 2);
		assert.deepEqual(clock.sleeps, [10_000]);
		assert.equal(calls[1]!.at - calls[0]!.at, 10_000);
	});

	void it("persistent 429 fails as RATE_LIMITED after the allowed retry", async () => {
		const clock = createFakeClock();
		const { fetch, calls } = scriptedFetch(clock, [
			htmlResponse("slow down", 429),
			htmlResponse("slow down", 429),
			htmlResponse("<p>never</p>")
		]);

		const error = await captureRejection(
			buildClient(clock, fetch).getHtml(PAGE_A)
		);

		const failure = assertFailure(error, "RATE_LIMITED");
		assert.equal(failure.detail.attempts, 2);
		assert.equal(calls.length, 2);
	});

	void it("Retry-After in seconds is respected when it exceeds the regular delay", async () => {
		const clock = createFakeClock();
		const { fetch, calls } = scriptedFetch(clock, [
			htmlResponse("slow down", 429, { "Retry-After": "30" }),
			htmlResponse("<p>ok</p>")
		]);

		await buildClient(clock, fetch).getHtml(PAGE_A);

		assert.equal(calls[1]!.at - calls[0]!.at, 30_000);
	});

	void it("Retry-After as an HTTP date is respected", async () => {
		const clock = createFakeClock(Date.parse("2026-11-01T12:00:00Z"));
		const { fetch, calls } = scriptedFetch(clock, [
			htmlResponse("slow down", 429, {
				"Retry-After": "Sun, 01 Nov 2026 12:00:45 GMT"
			}),
			htmlResponse("<p>ok</p>")
		]);

		await buildClient(clock, fetch).getHtml(PAGE_A);

		assert.equal(calls[1]!.at - calls[0]!.at, 45_000);
	});

	void it("a Retry-After shorter than the throttle still waits the throttle", async () => {
		const clock = createFakeClock();
		const { fetch, calls } = scriptedFetch(clock, [
			htmlResponse("slow down", 429, { "Retry-After": "1" }),
			htmlResponse("<p>ok</p>")
		]);

		await buildClient(clock, fetch).getHtml(PAGE_A);

		assert.equal(calls[1]!.at - calls[0]!.at, MIN_DELAY_MS);
	});

	void it("a Retry-After above the cap fails at once instead of retrying early", async () => {
		const clock = createFakeClock();
		const { fetch, calls } = scriptedFetch(clock, [
			htmlResponse("slow down", 429, { "Retry-After": "3600" }),
			htmlResponse("<p>never</p>")
		]);
		const client = buildClient(clock, fetch);

		const error = await captureRejection(client.getHtml(PAGE_A));

		const failure = assertFailure(error, "RATE_LIMITED");
		assert.equal(failure.detail.retryAfterMs, 3_600_000);
		assert.equal(calls.length, 1);
	});

	void it("background requests wait a Retry-After up to their own cap and then retry", async () => {
		const clock = createFakeClock();
		const { fetch, calls } = scriptedFetch(clock, [
			htmlResponse("slow down", 429, { "Retry-After": "300" }),
			htmlResponse("<p>ok</p>")
		]);
		const client = buildClient(clock, fetch, {
			backgroundMaxRetryAfterMs: 600_000
		});

		const body = await client.getHtml(PAGE_A, { priority: "background" });

		assert.equal(body, "<p>ok</p>");
		assert.equal(calls[1]!.at - calls[0]!.at, 300_000);
	});

	void it("interactive requests keep the regular cap even when the background cap is longer", async () => {
		const clock = createFakeClock();
		const { fetch, calls } = scriptedFetch(clock, [
			htmlResponse("slow down", 429, { "Retry-After": "300" }),
			htmlResponse("<p>never</p>")
		]);
		const client = buildClient(clock, fetch, {
			backgroundMaxRetryAfterMs: 600_000
		});

		const error = await captureRejection(
			client.getHtml(PAGE_A, { priority: "interactive" })
		);

		const failure = assertFailure(error, "RATE_LIMITED");
		assert.equal(failure.detail.status, 429);
		assert.equal(failure.detail.retryAfterMs, 300_000);
		assert.equal(calls.length, 1);
	});

	void it("a background Retry-After above its cap fails at once and holds the host up to that cap", async () => {
		const clock = createFakeClock();
		const { fetch, calls } = scriptedFetch(clock, [
			htmlResponse("slow down", 429, { "Retry-After": "3600" }),
			htmlResponse("next")
		]);
		const client = buildClient(clock, fetch, {
			backgroundMaxRetryAfterMs: 600_000
		});

		const error = await captureRejection(
			client.getHtml(PAGE_A, { priority: "background" })
		);
		await client.getHtml(PAGE_B, { priority: "background" });

		assertFailure(error, "RATE_LIMITED");
		assert.equal(calls[1]!.at - calls[0]!.at, 600_000);
	});

	void it("a garbage Retry-After falls back to the exponential backoff", async () => {
		const clock = createFakeClock();
		const { fetch, calls } = scriptedFetch(clock, [
			htmlResponse("slow down", 429, { "Retry-After": "soon-ish" }),
			htmlResponse("<p>ok</p>")
		]);

		await buildClient(clock, fetch).getHtml(PAGE_A);

		assert.equal(calls[1]!.at - calls[0]!.at, 10_000);
	});

	void it("5xx retries and then fails as REQUEST_ERROR with the last status", async () => {
		const clock = createFakeClock();
		const { fetch, calls } = scriptedFetch(clock, [
			htmlResponse("oops", 502),
			htmlResponse("oops", 500)
		]);

		const error = await captureRejection(
			buildClient(clock, fetch).getHtml(PAGE_A)
		);

		assert.equal(assertFailure(error, "REQUEST_ERROR").detail.status, 500);
		assert.equal(calls.length, 2);
	});

	void it("5xx followed by success returns the page", async () => {
		const clock = createFakeClock();
		const { fetch } = scriptedFetch(clock, [
			htmlResponse("oops", 503, { "Retry-After": "20" }),
			htmlResponse("<p>ok</p>")
		]);

		assert.equal(
			await buildClient(clock, fetch).getHtml(PAGE_A),
			"<p>ok</p>"
		);
		assert.deepEqual(clock.sleeps, [20_000]);
	});

	void it("a network failure is retried and then fails as REQUEST_ERROR", async () => {
		const clock = createFakeClock();
		const { fetch, calls } = scriptedFetch(clock, [
			new TypeError("fetch failed"),
			new TypeError("fetch failed")
		]);

		const error = await captureRejection(
			buildClient(clock, fetch).getHtml(PAGE_A)
		);

		const failure = assertFailure(error, "REQUEST_ERROR");
		assert.equal(failure.detail.reason, "fetch failed");
		assert.equal(calls.length, 2);
	});

	void it("a transient network failure followed by success returns the page", async () => {
		const clock = createFakeClock();
		const { fetch } = scriptedFetch(clock, [
			new TypeError("ECONNRESET"),
			htmlResponse("<p>ok</p>")
		]);

		assert.equal(
			await buildClient(clock, fetch).getHtml(PAGE_A),
			"<p>ok</p>"
		);
	});

	void it("a request that never answers fails as TIMEOUT after the retry", async () => {
		const clock = createFakeClock();
		let attempts = 0;
		const hanging = fetchThatHangsUntilAborted();

		const error = await captureRejection(
			buildClient(clock, (url, init) => {
				attempts += 1;
				return hanging(url, init);
			}).getHtml(PAGE_A)
		);

		assertFailure(error, "TIMEOUT");
		assert.equal(attempts, 2);
	});

	void it("a body that stalls mid-download also times out", async () => {
		const clock = createFakeClock();
		const stalledBody = (signal: AbortSignal | null | undefined) =>
			new Response(
				new ReadableStream({
					start(controller) {
						controller.enqueue(
							new TextEncoder().encode("<html><bo")
						);
						signal?.addEventListener("abort", () =>
							controller.error(
								new DOMException("aborted", "AbortError")
							)
						);
					}
				})
			);

		const error = await captureRejection(
			buildClient(clock, async (_url, init) => stalledBody(init.signal), {
				maxRetries: 0
			}).getHtml(PAGE_A)
		);

		assertFailure(error, "TIMEOUT");
	});

	void it("maxRetries 0 disables retries", async () => {
		const clock = createFakeClock();
		const { fetch, calls } = scriptedFetch(clock, [
			htmlResponse("oops", 500)
		]);

		await captureRejection(
			buildClient(clock, fetch, { maxRetries: 0 }).getHtml(PAGE_A)
		);

		assert.equal(calls.length, 1);
	});
});

void describe("ScrapingHttpClient throttle", () => {
	void it("waits the minimum delay plus jitter between requests to the same host", async () => {
		const clock = createFakeClock();
		const { fetch, calls } = scriptedFetch(clock, [
			htmlResponse("a"),
			htmlResponse("b"),
			htmlResponse("c")
		]);
		const jitters = [0.5, 1];
		const client = buildClient(clock, fetch, {
			random: () => jitters.shift() ?? 0
		});

		await client.getHtml(PAGE_A);
		await client.getHtml(PAGE_B);
		await client.getHtml(PAGE_A);

		assert.equal(calls[1]!.at - calls[0]!.at, MIN_DELAY_MS + JITTER_MS / 2);
		assert.equal(calls[2]!.at - calls[1]!.at, MIN_DELAY_MS + JITTER_MS);
	});

	void it("the delay counts from the end of the previous request", async () => {
		const clock = createFakeClock();
		const { fetch, calls } = scriptedFetch(clock, [
			async () => {
				clock.advance(3000);
				return htmlResponse("slow");
			},
			htmlResponse("b")
		]);
		const client = buildClient(clock, fetch);

		await client.getHtml(PAGE_A);
		await client.getHtml(PAGE_B);

		assert.equal(calls[1]!.at - calls[0]!.at, 3000 + MIN_DELAY_MS);
	});

	void it("does not wait again when the delay already elapsed", async () => {
		const clock = createFakeClock();
		const { fetch } = scriptedFetch(clock, [
			htmlResponse("a"),
			htmlResponse("b")
		]);
		const client = buildClient(clock, fetch);

		await client.getHtml(PAGE_A);
		clock.advance(60_000);
		await client.getHtml(PAGE_B);

		assert.deepEqual(clock.sleeps, []);
	});

	void it("concurrent calls to the same host go out one at a time, in order and spaced", async () => {
		const clock = createFakeClock();
		const first = deferred<Response>();
		const { fetch, calls } = scriptedFetch(clock, [
			() => first.promise,
			htmlResponse("second"),
			htmlResponse("third")
		]);
		const client = buildClient(clock, fetch);

		const results = [
			client.getHtml(PAGE_A),
			client.getHtml(PAGE_B),
			client.getHtml(PAGE_A)
		];
		await new Promise(resolve => setImmediate(resolve));

		assert.equal(calls.length, 1);

		clock.advance(1000);
		first.resolve(htmlResponse("first"));

		assert.deepEqual(await Promise.all(results), [
			"first",
			"second",
			"third"
		]);
		assert.deepEqual(
			calls.map(call => call.url),
			[PAGE_A.toString(), PAGE_B.toString(), PAGE_A.toString()]
		);
		assert.equal(calls[1]!.at - calls[0]!.at, 1000 + MIN_DELAY_MS);
		assert.equal(calls[2]!.at - calls[1]!.at, MIN_DELAY_MS);
	});

	void it("a failed request does not stall the queue for the next one", async () => {
		const clock = createFakeClock();
		const { fetch, calls } = scriptedFetch(clock, [
			htmlResponse("gone", 404),
			htmlResponse("next")
		]);
		const client = buildClient(clock, fetch);

		const [failed, next] = await Promise.allSettled([
			client.getHtml(PAGE_A),
			client.getHtml(PAGE_B)
		]);

		assert.equal(failed.status, "rejected");
		assert.deepEqual(next, { status: "fulfilled", value: "next" });
		assert.equal(calls[1]!.at - calls[0]!.at, MIN_DELAY_MS);
	});

	void it("a Retry-After above the cap delays the next request to that host up to the cap", async () => {
		const clock = createFakeClock();
		const { fetch, calls } = scriptedFetch(clock, [
			htmlResponse("slow down", 429, { "Retry-After": "3600" }),
			htmlResponse("next")
		]);
		const client = buildClient(clock, fetch);

		await captureRejection(client.getHtml(PAGE_A));
		await client.getHtml(PAGE_B);

		assert.equal(calls[1]!.at - calls[0]!.at, 60_000);
	});

	void it("different hosts do not wait for each other", async () => {
		const clock = createFakeClock();
		const slowHost = deferred<Response>();
		const calls: string[] = [];
		const client = buildClient(clock, async url => {
			calls.push(url);
			return url.startsWith("https://howlongtobeat.com")
				? await slowHost.promise
				: htmlResponse("fast");
		});

		const slow = client.getHtml(PAGE_A);
		const fast = await client.getHtml(OTHER_HOST_PAGE);

		assert.equal(fast, "fast");
		assert.deepEqual(clock.sleeps, []);
		assert.equal(calls.length, 2);

		slowHost.resolve(htmlResponse("slow"));
		assert.equal(await slow, "slow");
	});
});
