import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { ServiceError } from "../../src/common/errors/service-error";
import { isTimeoutError } from "../../src/common/utils/is-timeout-error.util";
import { IgdbProvider } from "../../src/igdb/igdb.provider";
import { IgdbTokenClient } from "../../src/igdb/igdb-token.client";
import { RawgProvider } from "../../src/rawg/rawg.provider";
import { captureRejection } from "../unit-helpers/mocks";

const SHORT_TIMEOUT_MS = 20;
const REQUEST_ERROR_CODES: Record<string, string> = {
	"RAWG Provider": "RAWG_REQUEST_ERROR",
	"IGDB Provider": "IGDB_REQUEST_ERROR"
};

afterEach(() => {
	mock.restoreAll();
});

function hangUntilAborted() {
	const signals: (AbortSignal | undefined)[] = [];
	mock.method(globalThis, "fetch", ((
		_input: Parameters<typeof fetch>[0],
		init: RequestInit = {}
	) => {
		signals.push(init.signal ?? undefined);
		return new Promise<Response>((_resolve, reject) => {
			init.signal?.addEventListener("abort", () =>
				reject(init.signal?.reason)
			);
		});
	}) as typeof fetch);
	return signals;
}

function bodyThatNeverEnds(signal?: AbortSignal | null) {
	const stream = new ReadableStream({
		start(controller) {
			signal?.addEventListener("abort", () =>
				controller.error(signal.reason)
			);
		}
	});
	return new Response(stream, {
		status: 200,
		headers: { "content-type": "application/json" }
	});
}

function assertTimeout(error: unknown, service: string, message: string) {
	assert.ok(error instanceof ServiceError);
	assert.equal(error.code, REQUEST_ERROR_CODES[service]);
	assert.equal(error.serviceError.service, service);
	assert.equal(error.serviceError.raw, message);
}

void describe("isTimeoutError", () => {
	void it("recognizes the error of AbortSignal.timeout", async () => {
		const signal = AbortSignal.timeout(1);
		await new Promise(resolve => setTimeout(resolve, 10));

		assert.equal(isTimeoutError(signal.reason), true);
	});

	void it("does not confuse a manual abort or other errors with a timeout", () => {
		const controller = new AbortController();
		controller.abort();

		assert.equal(isTimeoutError(controller.signal.reason), false);
		assert.equal(isTimeoutError(new TypeError("fetch failed")), false);
		assert.equal(isTimeoutError("TimeoutError"), false);
		assert.equal(isTimeoutError(null), false);
	});
});

void describe("RawgProvider request timeout", () => {
	void it("gives up on a RAWG request that never answers and reports RAWG_REQUEST_ERROR", async () => {
		const signals = hangUntilAborted();
		const provider = new RawgProvider("fake-key", SHORT_TIMEOUT_MS);

		const error = await captureRejection(provider.searchGame("zelda"));

		assertTimeout(
			error,
			"RAWG Provider",
			`RAWG request timed out after ${SHORT_TIMEOUT_MS} ms`
		);
		assert.ok(signals[0], "fetch received no abort signal");
	});

	void it("gives up when RAWG sends the headers but never finishes the body", async () => {
		mock.method(globalThis, "fetch", ((
			_input: Parameters<typeof fetch>[0],
			init: RequestInit = {}
		) => Promise.resolve(bodyThatNeverEnds(init.signal))) as typeof fetch);
		const provider = new RawgProvider("fake-key", SHORT_TIMEOUT_MS);

		const error = await captureRejection(provider.getGameBySlug("zelda"));

		assertTimeout(
			error,
			"RAWG Provider",
			`RAWG request timed out after ${SHORT_TIMEOUT_MS} ms`
		);
	});

	void it("times out each request on its own when several run at once", async () => {
		const signals = hangUntilAborted();
		const provider = new RawgProvider("fake-key", SHORT_TIMEOUT_MS);

		const errors = await Promise.all([
			captureRejection(provider.searchGame("zelda")),
			captureRejection(provider.getGameById(1)),
			captureRejection(provider.getGameBySlug("hades"))
		]);

		assert.equal(signals.length, 3);
		assert.equal(new Set(signals).size, 3);
		for (const error of errors)
			assertTimeout(
				error,
				"RAWG Provider",
				`RAWG request timed out after ${SHORT_TIMEOUT_MS} ms`
			);
	});
});

void describe("IgdbProvider request timeout", () => {
	void it("gives up on an IGDB request that never answers and reports IGDB_REQUEST_ERROR", async () => {
		mock.method(globalThis, "fetch", ((
			input: Parameters<typeof fetch>[0],
			init: RequestInit = {}
		) => {
			if (String(input).startsWith("https://id.twitch.tv"))
				return Promise.resolve(
					new Response(
						JSON.stringify({
							access_token: "token",
							expires_in: 3600,
							token_type: "bearer"
						}),
						{ status: 200 }
					)
				);
			return new Promise<Response>((_resolve, reject) => {
				init.signal?.addEventListener("abort", () =>
					reject(init.signal?.reason)
				);
			});
		}) as typeof fetch);
		const provider = new IgdbProvider(
			"client",
			"secret",
			new IgdbTokenClient("client", "secret"),
			SHORT_TIMEOUT_MS
		);

		const error = await captureRejection(provider.searchGame("zelda"));

		assertTimeout(
			error,
			"IGDB Provider",
			`IGDB request timed out after ${SHORT_TIMEOUT_MS} ms`
		);
	});

	void it("gives up on a Twitch token request that never answers", async () => {
		hangUntilAborted();
		const tokenClient = new IgdbTokenClient(
			"client",
			"secret",
			() => Date.now(),
			SHORT_TIMEOUT_MS
		);

		const error = await captureRejection(tokenClient.getToken());

		assertTimeout(
			error,
			"IGDB Provider",
			`IGDB token request timed out after ${SHORT_TIMEOUT_MS} ms`
		);
	});

	void it("asks Twitch again after a token request timed out", async () => {
		let attempts = 0;
		mock.method(globalThis, "fetch", ((
			_input: Parameters<typeof fetch>[0],
			init: RequestInit = {}
		) => {
			attempts++;
			if (attempts === 1)
				return new Promise<Response>((_resolve, reject) => {
					init.signal?.addEventListener("abort", () =>
						reject(init.signal?.reason)
					);
				});
			return Promise.resolve(
				new Response(
					JSON.stringify({
						access_token: "fresh",
						expires_in: 3600,
						token_type: "bearer"
					}),
					{ status: 200 }
				)
			);
		}) as typeof fetch);
		const tokenClient = new IgdbTokenClient(
			"client",
			"secret",
			() => Date.now(),
			SHORT_TIMEOUT_MS
		);

		await captureRejection(tokenClient.getToken());

		assert.equal(await tokenClient.getToken(), "fresh");
		assert.equal(attempts, 2);
	});
});
