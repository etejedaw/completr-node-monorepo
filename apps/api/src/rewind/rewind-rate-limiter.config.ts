import { RateLimiterMemory } from "rate-limiter-flexible";

const MINUTES_TO_SECONDS = 60;

export const rewindGenerationLimiter = new RateLimiterMemory({
	keyPrefix: "rewind-generation",
	points: 5,
	duration: 10 * MINUTES_TO_SECONDS
});
