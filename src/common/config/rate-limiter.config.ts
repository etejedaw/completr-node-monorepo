import { RateLimiterMemory } from "rate-limiter-flexible";

const MINUTES_TO_SECONDS = 60;

export const authLimiter = new RateLimiterMemory({
	points: 5,
	duration: 1 * MINUTES_TO_SECONDS,
	blockDuration: 15 * MINUTES_TO_SECONDS
});

export const registerLimiter = new RateLimiterMemory({
	points: 3,
	duration: 1 * MINUTES_TO_SECONDS
});

export const publicLimiter = new RateLimiterMemory({
	points: 100,
	duration: 60
});

export const userLimiter = new RateLimiterMemory({
	points: 50,
	duration: 60
});
