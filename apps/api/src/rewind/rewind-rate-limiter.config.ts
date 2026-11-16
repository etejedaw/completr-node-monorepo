import { RateLimiterMemory } from "rate-limiter-flexible";

import { REWIND_GENERATIONS_PER_DAY } from "./rewind.constants";

const DAY_IN_SECONDS = 24 * 60 * 60;

export const rewindGenerationLimiter = new RateLimiterMemory({
	keyPrefix: "rewind-generation",
	points: REWIND_GENERATIONS_PER_DAY,
	duration: DAY_IN_SECONDS
});
