import { RateLimiterMemory } from "rate-limiter-flexible";

import { REWIND_AI_RECAPS_PER_DAY } from "./rewind.constants";

const MINUTE_IN_SECONDS = 60;
const DAY_IN_SECONDS = 24 * 60 * MINUTE_IN_SECONDS;

export const rewindGenerationLimiter = new RateLimiterMemory({
	keyPrefix: "rewind-generation",
	points: 5,
	duration: 10 * MINUTE_IN_SECONDS
});

export const rewindAiRecapDailyLimiter = new RateLimiterMemory({
	keyPrefix: "rewind-ai-recap-daily",
	points: REWIND_AI_RECAPS_PER_DAY,
	duration: DAY_IN_SECONDS
});
