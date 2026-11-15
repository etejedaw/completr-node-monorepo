import { RateLimiterMemory } from "rate-limiter-flexible";

import { SECONDS_PER_MINUTE } from "../constants/time.constants";

const REQUESTS_PER_MINUTE_LIMIT = 300;

export const authLimiter = new RateLimiterMemory({
	points: 5,
	duration: SECONDS_PER_MINUTE,
	blockDuration: 15 * SECONDS_PER_MINUTE
});

export const registerLimiter = new RateLimiterMemory({
	points: 3,
	duration: SECONDS_PER_MINUTE
});

export const passwordResetLimiter = new RateLimiterMemory({
	points: 3,
	duration: 15 * SECONDS_PER_MINUTE
});

export const publicLimiter = new RateLimiterMemory({
	points: REQUESTS_PER_MINUTE_LIMIT,
	duration: SECONDS_PER_MINUTE
});

export const userLimiter = new RateLimiterMemory({
	points: REQUESTS_PER_MINUTE_LIMIT,
	duration: SECONDS_PER_MINUTE
});

export const dataExportLimiter = new RateLimiterMemory({
	points: 3,
	duration: 15 * SECONDS_PER_MINUTE
});
