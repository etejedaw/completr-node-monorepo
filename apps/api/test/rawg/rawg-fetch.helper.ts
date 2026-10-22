import { mock } from "node:test";

import {
	type RawgGameDetail,
	type RawgSearchResponse
} from "../../src/rawg/rawg.interface";

const RAWG_HOST = "api.rawg.io";
const RAWG_GAMES_PATH = "/api/games";

export type RawgHandler = (url: URL) => Response | Promise<Response>;

export function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" }
	});
}

function requestUrl(input: Parameters<typeof fetch>[0]) {
	if (typeof input === "string") return new URL(input);
	if (input instanceof URL) return input;
	return new URL(input.url);
}

export function stubRawgFetch(handler: RawgHandler) {
	const originalFetch = globalThis.fetch;
	const rawgCalls: URL[] = [];

	mock.method(globalThis, "fetch", (async (
		input: Parameters<typeof fetch>[0],
		init?: Parameters<typeof fetch>[1]
	) => {
		const url = requestUrl(input);
		if (url.host !== RAWG_HOST) return originalFetch(input, init);
		rawgCalls.push(url);
		return handler(url);
	}) as typeof fetch);

	return { rawgCalls };
}

export function rawgCatalogHandler(options: {
	search?: RawgSearchResponse;
	details?: RawgGameDetail[];
}): RawgHandler {
	const details = options.details ?? [];
	return url => {
		if (url.pathname === RAWG_GAMES_PATH)
			return jsonResponse(
				options.search ?? { count: 0, next: null, results: [] }
			);

		const identifier = url.pathname.slice(`${RAWG_GAMES_PATH}/`.length);
		const detail = details.find(
			candidate =>
				String(candidate.id) === identifier ||
				candidate.slug === identifier
		);
		if (!detail) return jsonResponse({ detail: "Not found." }, 404);
		return jsonResponse(detail);
	};
}

export function rawgFailureHandler(status: number): RawgHandler {
	return () => jsonResponse({ detail: "Failure" }, status);
}
