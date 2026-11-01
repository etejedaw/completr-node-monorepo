import assert from "node:assert/strict";

import { ServiceError } from "../../src/common/errors/service-error";
import { type ScrapingHttpClientOptions } from "../../src/scraping/scraping.interface";
import { type ScrapingFetch } from "../../src/scraping/scraping.types";
import { ScrapingHttpClient } from "../../src/scraping/scraping-http.client";

export const MIN_DELAY_MS = 5000;
export const JITTER_MS = 2000;

export interface FakeFetchCall {
	url: string;
	init: RequestInit;
	at: number;
}

export function createFakeClock(start = 1_000_000) {
	let current = start;
	const sleeps: number[] = [];

	return {
		sleeps,
		now: () => current,
		advance: (milliseconds: number) => {
			current += milliseconds;
		},
		sleep: async (milliseconds: number) => {
			sleeps.push(milliseconds);
			current += milliseconds;
		}
	};
}

export function htmlResponse(
	body: string,
	status = 200,
	headers: Record<string, string> = {}
) {
	return new Response(body, {
		status,
		headers: { "Content-Type": "text/html; charset=utf-8", ...headers }
	});
}

export function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((onResolve, onReject) => {
		resolve = onResolve;
		reject = onReject;
	});
	return { promise, resolve, reject };
}

export function scriptedFetch(
	clock: ReturnType<typeof createFakeClock>,
	responses: (Response | Error | (() => Promise<Response>))[]
) {
	const calls: FakeFetchCall[] = [];
	const fetch: ScrapingFetch = async (url, init) => {
		calls.push({ url, init, at: clock.now() });
		const next = responses.shift();
		if (next === undefined) throw new Error(`Unexpected request to ${url}`);
		if (next instanceof Error) throw next;
		if (typeof next === "function") return await next();
		return next;
	};
	return { fetch, calls };
}

export function fetchThatHangsUntilAborted(): ScrapingFetch {
	return (_url, init) =>
		new Promise((_resolve, reject) => {
			init.signal?.addEventListener("abort", () =>
				reject(
					new DOMException("The operation was aborted.", "AbortError")
				)
			);
		});
}

export function buildClient(
	clock: ReturnType<typeof createFakeClock>,
	fetch: ScrapingFetch,
	overrides: Partial<ScrapingHttpClientOptions> = {}
) {
	return new ScrapingHttpClient({
		minDelayMs: MIN_DELAY_MS,
		jitterMs: JITTER_MS,
		timeoutMs: 20,
		maxRetries: 1,
		retryBaseDelayMs: 10_000,
		maxRetryAfterMs: 60_000,
		fetch,
		sleep: clock.sleep,
		now: clock.now,
		random: () => 0,
		...overrides
	});
}

export function assertServiceError(
	error: unknown,
	code: string,
	service: string
) {
	assert.ok(
		error instanceof ServiceError,
		`expected ServiceError, got ${String(error)}`
	);
	assert.equal(error.code, code);
	assert.equal(error.serviceError.service, service);
	return error;
}
