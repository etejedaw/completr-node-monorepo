import { type Request, type Response } from "express";

const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5_000;

interface CachedJsonProxyOptions {
	sourceUrl: string;
	unavailableMessage: string;
}

interface CachedBody {
	body: unknown;
	fetchedAt: number;
}

async function fetchJson(sourceUrl: string): Promise<unknown> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	try {
		const response = await fetch(sourceUrl, {
			signal: controller.signal,
			headers: { Accept: "application/json" }
		});
		if (!response.ok) {
			throw new Error(`Source ${sourceUrl} returned ${response.status}`);
		}
		return await response.json();
	} finally {
		clearTimeout(timeout);
	}
}

export function createCachedJsonProxy({
	sourceUrl,
	unavailableMessage
}: CachedJsonProxyOptions) {
	let cache: CachedBody | null = null;
	let inflight: Promise<unknown> | null = null;

	return async (_request: Request, response: Response) => {
		const now = Date.now();
		if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
			return response.status(200).json(cache.body);
		}

		try {
			inflight ??= fetchJson(sourceUrl);
			const body = await inflight;
			cache = { body, fetchedAt: now };
			return response.status(200).json(body);
		} catch {
			if (cache) return response.status(200).json(cache.body);
			return response.status(503).json({ error: unavailableMessage });
		} finally {
			inflight = null;
		}
	};
}
