import { Request, Response } from "express";

import { environmentConfig } from "../common/config/environment.config";

const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5_000;

interface ChangelogCache {
	body: unknown;
	fetchedAt: number;
}

let cache: ChangelogCache | null = null;
let inflight: Promise<unknown> | null = null;

async function fetchFromSource(): Promise<unknown> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	try {
		const response = await fetch(environmentConfig.CHANGELOG_SOURCE_URL, {
			signal: controller.signal,
			headers: { Accept: "application/json" }
		});
		if (!response.ok) {
			throw new Error(`Changelog source returned ${response.status}`);
		}
		return await response.json();
	} finally {
		clearTimeout(timeout);
	}
}

export async function getChangelog(_request: Request, response: Response) {
	const now = Date.now();
	if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
		return response.status(200).json(cache.body);
	}

	try {
		inflight ??= fetchFromSource();
		const body = await inflight;
		cache = { body, fetchedAt: now };
		return response.status(200).json(body);
	} catch {
		if (cache) return response.status(200).json(cache.body);
		return response
			.status(503)
			.json({ error: "Changelog source unavailable" });
	} finally {
		inflight = null;
	}
}
