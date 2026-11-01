import { type ScrapingRequestError } from "./errors/scraping-request.error";

export type ScrapingFailureKind =
	"NOT_FOUND" | "RATE_LIMITED" | "BLOCKED" | "TIMEOUT" | "REQUEST_ERROR";

export type ScrapingFetch = (
	input: string,
	init: RequestInit
) => Promise<Response>;

export type ScrapingSleep = (milliseconds: number) => Promise<void>;

export type ScrapingAttemptOutcome =
	| { ok: true; body: string }
	| {
			ok: false;
			error: ScrapingRequestError;
			retryable: boolean;
			retryAfterMs?: number;
	  };
