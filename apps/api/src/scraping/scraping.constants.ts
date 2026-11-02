export const SCRAPING_USER_AGENT =
	"CompletrBot/1.0 (+https://www.completr.app)";

export const SCRAPING_DEFAULTS = {
	minDelayMs: 5000,
	jitterMs: 2000,
	timeoutMs: 15_000,
	maxRetries: 1,
	retryBaseDelayMs: 10_000,
	maxRetryAfterMs: 60_000
} as const;

export const CHALLENGE_HEADER = "cf-mitigated";

export const CHALLENGE_BODY_PATTERNS: readonly RegExp[] = [
	/<title>\s*Just a moment\.\.\.\s*<\/title>/i,
	/<title>\s*Attention Required! \| Cloudflare\s*<\/title>/i,
	/id="challenge-form"/i,
	/window\._cf_chl_opt/i,
	/captcha-delivery\.com/i,
	/id="px-captcha"/i,
	/class="g-recaptcha"/i,
	/class="h-captcha"/i
];
