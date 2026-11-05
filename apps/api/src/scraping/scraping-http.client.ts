import { ScrapingRequestError } from "./errors/scraping-request.error";
import { SCRAPING_DEFAULTS, SCRAPING_USER_AGENT } from "./scraping.constants";
import {
	type ScrapingHttpClientOptions,
	type ScrapingRequestOptions
} from "./scraping.interface";
import {
	type ScrapingAttemptOutcome,
	type ScrapingFailureKind,
	type ScrapingPriority
} from "./scraping.types";
import { interruptibleSleep } from "./utils/interruptible-sleep.util";
import { isChallengePage } from "./utils/is-challenge-page.util";
import { parseRetryAfter } from "./utils/parse-retry-after.util";

const NOT_FOUND_STATUSES = new Set([404, 410]);

const REQUEST_HEADERS = {
	Accept: "text/html,application/xhtml+xml",
	"Accept-Language": "en-US,en;q=0.8"
};

interface QueuedRequest {
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

interface HostQueue {
	waiting: QueuedRequest[];
	draining: boolean;
	wake?: AbortController;
}

export class ScrapingHttpClient {
	private static sharedInstance?: ScrapingHttpClient;

	private readonly options: ScrapingHttpClientOptions;
	private readonly hostQueues = new Map<string, HostQueue>();
	private readonly nextRequestAt = new Map<string, number>();
	private nextSequence = 0;

	constructor(options: Partial<ScrapingHttpClientOptions> = {}) {
		this.options = {
			userAgent: SCRAPING_USER_AGENT,
			...SCRAPING_DEFAULTS,
			fetch: (input, init) => fetch(input, init),
			sleep: interruptibleSleep,
			now: () => Date.now(),
			random: () => Math.random(),
			...options
		};
	}

	static shared(): ScrapingHttpClient {
		ScrapingHttpClient.sharedInstance ??= new ScrapingHttpClient();
		return ScrapingHttpClient.sharedInstance;
	}

	getHtml(url: URL, options: ScrapingRequestOptions = {}): Promise<string> {
		return this.getText(url, {}, options);
	}

	getText(
		url: URL,
		headers: Record<string, string> = {},
		{ priority = "background", signal }: ScrapingRequestOptions = {}
	): Promise<string> {
		if (signal?.aborted)
			return Promise.reject(this.abortedError(url.toString(), 0));

		return new Promise((resolve, reject) => {
			const leaveOnAbort = () => this.leaveQueueOnAbort(request);
			const stopListening = () =>
				signal?.removeEventListener("abort", leaveOnAbort);
			const request: QueuedRequest = {
				url,
				headers: { ...REQUEST_HEADERS, ...headers },
				priority,
				signal,
				sequence: this.nextSequence++,
				attempts: 0,
				notBefore: 0,
				resolve: body => {
					stopListening();
					resolve(body);
				},
				reject: error => {
					stopListening();
					reject(error);
				}
			};

			signal?.addEventListener("abort", leaveOnAbort, { once: true });
			this.enqueue(request);
		});
	}

	private enqueue(request: QueuedRequest) {
		const host = request.url.host;
		let queue = this.hostQueues.get(host);
		if (!queue) {
			queue = { waiting: [], draining: false };
			this.hostQueues.set(host, queue);
		}

		queue.waiting.push(request);
		queue.wake?.abort();

		if (queue.draining) return;
		queue.draining = true;
		const startedQueue = queue;
		void Promise.resolve().then(() => this.drain(host, startedQueue));
	}

	private leaveQueueOnAbort(request: QueuedRequest) {
		const queue = this.hostQueues.get(request.url.host);
		if (!queue || !this.removeWaiting(queue, request)) return;

		request.reject(
			this.abortedError(request.url.toString(), request.attempts)
		);
		queue.wake?.abort();
	}

	private removeWaiting(queue: HostQueue, request: QueuedRequest) {
		const index = queue.waiting.indexOf(request);
		if (index === -1) return false;
		queue.waiting.splice(index, 1);
		return true;
	}

	private async drain(host: string, queue: HostQueue) {
		try {
			for (
				let next = this.nextInLine(queue);
				next;
				next = this.nextInLine(queue)
			) {
				const readyAt = Math.max(
					this.nextRequestAt.get(host) ?? 0,
					next.notBefore
				);
				const wait = readyAt - this.options.now();
				if (wait > 0) {
					await this.waitUnlessWoken(queue, wait);
					continue;
				}

				this.removeWaiting(queue, next);
				await this.dispatch(next);
			}
		} finally {
			queue.draining = false;
			if (this.hostQueues.get(host) === queue)
				this.hostQueues.delete(host);
		}
	}

	private nextInLine(queue: HostQueue): QueuedRequest | undefined {
		const interactive = queue.waiting.filter(
			request => request.priority === "interactive"
		);
		const candidates = interactive.length > 0 ? interactive : queue.waiting;

		return candidates.reduce<QueuedRequest | undefined>(
			(first, request) =>
				!first || request.sequence < first.sequence ? request : first,
			undefined
		);
	}

	private async waitUnlessWoken(queue: HostQueue, milliseconds: number) {
		const wake = new AbortController();
		queue.wake = wake;
		try {
			await this.options.sleep(milliseconds, wake.signal);
		} finally {
			if (queue.wake === wake) queue.wake = undefined;
		}
	}

	private async dispatch(request: QueuedRequest) {
		request.attempts += 1;
		const outcome = await this.attempt(request);
		this.scheduleNextRequest(request, outcome);

		if (outcome.ok) {
			request.resolve(outcome.body);
			return;
		}

		if (outcome.retryable && request.attempts <= this.options.maxRetries) {
			request.notBefore =
				this.options.now() + this.retryDelay(request, outcome);
			this.enqueue(request);
			return;
		}

		request.reject(outcome.error);
	}

	private scheduleNextRequest(
		request: QueuedRequest,
		outcome: ScrapingAttemptOutcome
	) {
		const { minDelayMs, jitterMs, random, now } = this.options;
		const throttleDelay = minDelayMs + Math.round(random() * jitterMs);
		const hostPenalty = outcome.ok
			? 0
			: this.hostPenaltyDelay(request, outcome);

		this.nextRequestAt.set(
			request.url.host,
			now() + Math.max(throttleDelay, hostPenalty)
		);
	}

	private maxRetryAfterFor(priority: ScrapingPriority) {
		return priority === "background"
			? this.options.backgroundMaxRetryAfterMs
			: this.options.maxRetryAfterMs;
	}

	private hostPenaltyDelay(
		request: QueuedRequest,
		outcome: Extract<ScrapingAttemptOutcome, { ok: false }>
	) {
		if (outcome.retryAfterMs !== undefined)
			return Math.min(
				outcome.retryAfterMs,
				this.maxRetryAfterFor(request.priority)
			);

		if (outcome.retryable && outcome.error.kind === "RATE_LIMITED")
			return this.exponentialBackoff(request.attempts);

		return 0;
	}

	private retryDelay(
		request: QueuedRequest,
		outcome: Extract<ScrapingAttemptOutcome, { ok: false }>
	) {
		if (outcome.retryAfterMs !== undefined)
			return Math.min(
				outcome.retryAfterMs,
				this.maxRetryAfterFor(request.priority)
			);

		return this.exponentialBackoff(request.attempts);
	}

	private exponentialBackoff(attempt: number) {
		return this.options.retryBaseDelayMs * 2 ** (attempt - 1);
	}

	private async attempt(
		request: QueuedRequest
	): Promise<ScrapingAttemptOutcome> {
		const { url, attempts, signal } = request;
		const controller = new AbortController();
		const timer = setTimeout(
			() => controller.abort(),
			this.options.timeoutMs
		);
		const abortFetch = () => controller.abort();
		signal?.addEventListener("abort", abortFetch, { once: true });

		try {
			const response = await this.options.fetch(url.toString(), {
				headers: {
					...request.headers,
					"User-Agent": this.options.userAgent
				},
				redirect: "follow",
				signal: controller.signal
			});
			const body = await response.text();
			if (signal?.aborted) return this.abortedOutcome(url, attempts);
			return this.classifyResponse(request, response, body);
		} catch (error) {
			if (signal?.aborted) return this.abortedOutcome(url, attempts);

			const kind = controller.signal.aborted
				? "TIMEOUT"
				: "REQUEST_ERROR";
			const reason = error instanceof Error ? error.message : "unknown";
			return {
				ok: false,
				retryable: true,
				error: new ScrapingRequestError(
					kind,
					{ url: url.toString(), attempts, reason },
					error
				)
			};
		} finally {
			clearTimeout(timer);
			signal?.removeEventListener("abort", abortFetch);
		}
	}

	private abortedOutcome(url: URL, attempts: number): ScrapingAttemptOutcome {
		return {
			ok: false,
			retryable: false,
			error: this.abortedError(url.toString(), attempts)
		};
	}

	private abortedError(url: string, attempts: number) {
		return new ScrapingRequestError("ABORTED", {
			url,
			attempts,
			reason: "aborted by caller"
		});
	}

	private classifyResponse(
		request: QueuedRequest,
		response: Response,
		body: string
	): ScrapingAttemptOutcome {
		const { url, attempts: attempt } = request;
		const { status } = response;

		if (isChallengePage(response.headers, body) || status === 403)
			return this.failure("BLOCKED", url, attempt, status, false);

		if (NOT_FOUND_STATUSES.has(status))
			return this.failure("NOT_FOUND", url, attempt, status, false);

		if (status === 429 || status >= 500) {
			const retryAfterMs = parseRetryAfter(
				response.headers.get("Retry-After"),
				this.options.now()
			);
			const kind = status === 429 ? "RATE_LIMITED" : "REQUEST_ERROR";
			const retryable =
				retryAfterMs === undefined ||
				retryAfterMs <= this.maxRetryAfterFor(request.priority);
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
