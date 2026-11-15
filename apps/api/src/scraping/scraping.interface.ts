import {
	type ScrapingFetch,
	type ScrapingPriority,
	type ScrapingSleep
} from "./scraping.types";

export interface ScrapingHttpClientOptions {
	userAgent: string;
	minDelayMs: number;
	jitterMs: number;
	timeoutMs: number;
	maxRetries: number;
	retryBaseDelayMs: number;
	maxRetryAfterMs: number;
	backgroundMaxRetryAfterMs: number;
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

export interface ScrapingRequestOptions {
	priority?: ScrapingPriority;
	signal?: AbortSignal;
}

export interface QueuedRequest {
	url: URL;
	headers: Record<string, string>;
	priority: ScrapingPriority;
	signal?: AbortSignal;
	sequence: number;
	attempts: number;
	notBefore: number;
	resolve(body: string): void;
	reject(error: unknown): void;
}

export interface HostQueue {
	waiting: QueuedRequest[];
	draining: boolean;
	wake?: AbortController;
}
