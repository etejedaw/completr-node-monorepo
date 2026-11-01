import { type ScrapingFetch, type ScrapingSleep } from "./scraping.types";

export interface ScrapingHttpClientOptions {
	userAgent: string;
	minDelayMs: number;
	jitterMs: number;
	timeoutMs: number;
	maxRetries: number;
	retryBaseDelayMs: number;
	maxRetryAfterMs: number;
	fetch: ScrapingFetch;
	sleep: ScrapingSleep;
	now: () => number;
	random: () => number;
}

export interface ScrapingFailureDetail {
	url: string;
	status?: number;
	attempts: number;
	retryAfterMs?: number;
	reason?: string;
}
