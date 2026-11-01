import { ScrapingRequestError } from "./errors/scraping-request.error";
import { SCRAPING_DEFAULTS, SCRAPING_USER_AGENT } from "./scraping.constants";
import { type ScrapingHttpClientOptions } from "./scraping.interface";
import {
	type ScrapingAttemptOutcome,
	type ScrapingFailureKind
} from "./scraping.types";
import { isChallengePage } from "./utils/is-challenge-page.util";
import { parseRetryAfter } from "./utils/parse-retry-after.util";

const REQUEST_HEADERS = {
	Accept: "text/html,application/xhtml+xml",
	"Accept-Language": "en-US,en;q=0.8"
};

export class ScrapingHttpClient {
	private static sharedInstance?: ScrapingHttpClient;

	private readonly options: ScrapingHttpClientOptions;
	private readonly hostQueues = new Map<string, Promise<void>>();
	private readonly nextRequestAt = new Map<string, number>();

	constructor(options: Partial<ScrapingHttpClientOptions> = {}) {
		this.options = {
			userAgent: SCRAPING_USER_AGENT,
			...SCRAPING_DEFAULTS,
			fetch: (input, init) => fetch(input, init),
			sleep: milliseconds =>
				new Promise(resolve => setTimeout(resolve, milliseconds)),
			now: () => Date.now(),
			random: () => Math.random(),
			...options
		};
	}

	static shared(): ScrapingHttpClient {
		ScrapingHttpClient.sharedInstance ??= new ScrapingHttpClient();
		return ScrapingHttpClient.sharedInstance;
	}

	getHtml(url: URL): Promise<string> {
		return this.getText(url);
	}

	getText(url: URL, headers: Record<string, string> = {}): Promise<string> {
		const host = url.host;
		const previous = this.hostQueues.get(host) ?? Promise.resolve();
		const request = previous.then(() =>
			this.requestWithRetries(url, { ...REQUEST_HEADERS, ...headers })
		);
		const settled = request.then(
			() => undefined,
			() => undefined
		);

		this.hostQueues.set(host, settled);
		void settled.then(() => {
			if (this.hostQueues.get(host) === settled)
				this.hostQueues.delete(host);
		});

		return request;
	}

	private async requestWithRetries(
		url: URL,
		headers: Record<string, string>
	): Promise<string> {
		for (let attempt = 1; ; attempt += 1) {
			await this.waitForTurn(url.host);
			const outcome = await this.attempt(url, attempt, headers);
			this.scheduleNextRequest(url.host, outcome, attempt);

			if (outcome.ok) return outcome.body;
			if (!outcome.retryable || attempt > this.options.maxRetries)
				throw outcome.error;
		}
	}

	private async waitForTurn(host: string) {
		const nextRequestAt = this.nextRequestAt.get(host);
		if (nextRequestAt === undefined) return;

		const wait = nextRequestAt - this.options.now();
		if (wait > 0) await this.options.sleep(wait);
	}

	private scheduleNextRequest(
		host: string,
		outcome: ScrapingAttemptOutcome,
		attempt: number
	) {
		const { minDelayMs, jitterMs, random, now } = this.options;
		const throttleDelay = minDelayMs + Math.round(random() * jitterMs);
		const backoffDelay = outcome.ok
			? 0
			: this.backoffDelay(outcome, attempt);

		this.nextRequestAt.set(
			host,
			now() + Math.max(throttleDelay, backoffDelay)
		);
	}

	private backoffDelay(
		outcome: Extract<ScrapingAttemptOutcome, { ok: false }>,
		attempt: number
	) {
		const { retryBaseDelayMs, maxRetryAfterMs } = this.options;

		if (outcome.retryAfterMs !== undefined)
			return Math.min(outcome.retryAfterMs, maxRetryAfterMs);

		if (!outcome.retryable) return 0;

		return retryBaseDelayMs * 2 ** (attempt - 1);
	}

	private async attempt(
		url: URL,
		attempt: number,
		headers: Record<string, string>
	): Promise<ScrapingAttemptOutcome> {
		const controller = new AbortController();
		const timer = setTimeout(
			() => controller.abort(),
			this.options.timeoutMs
		);

		try {
			const response = await this.options.fetch(url.toString(), {
				headers: { ...headers, "User-Agent": this.options.userAgent },
				redirect: "follow",
				signal: controller.signal
			});
			const body = await response.text();
			return this.classifyResponse(url, attempt, response, body);
		} catch (error) {
			const kind = controller.signal.aborted
				? "TIMEOUT"
				: "REQUEST_ERROR";
			const reason = error instanceof Error ? error.message : "unknown";
			return {
				ok: false,
				retryable: true,
				error: new ScrapingRequestError(
					kind,
					{ url: url.toString(), attempts: attempt, reason },
					error
				)
			};
		} finally {
			clearTimeout(timer);
		}
	}

	private classifyResponse(
		url: URL,
		attempt: number,
		response: Response,
		body: string
	): ScrapingAttemptOutcome {
		const { status } = response;

		if (isChallengePage(response.headers, body) || status === 403)
			return this.failure("BLOCKED", url, attempt, status, false);

		if (status === 404)
			return this.failure("NOT_FOUND", url, attempt, status, false);

		if (status === 429 || status >= 500) {
			const retryAfterMs = parseRetryAfter(
				response.headers.get("Retry-After"),
				this.options.now()
			);
			const kind = status === 429 ? "RATE_LIMITED" : "REQUEST_ERROR";
			const retryable =
				retryAfterMs === undefined ||
				retryAfterMs <= this.options.maxRetryAfterMs;
			return this.failure(
				kind,
				url,
				attempt,
				status,
				retryable,
				retryAfterMs
			);
		}

		if (!response.ok)
			return this.failure("REQUEST_ERROR", url, attempt, status, false);

		return { ok: true, body };
	}

	private failure(
		kind: ScrapingFailureKind,
		url: URL,
		attempt: number,
		status: number,
		retryable: boolean,
		retryAfterMs?: number
	): ScrapingAttemptOutcome {
		return {
			ok: false,
			retryable,
			retryAfterMs,
			error: new ScrapingRequestError(kind, {
				url: url.toString(),
				status,
				attempts: attempt,
				retryAfterMs
			})
		};
	}
}
