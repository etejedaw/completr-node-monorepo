import { type RateLimiterMemory } from "rate-limiter-flexible";

import {
	isRateLimitExempt,
	isRateLimitingActive
} from "../../common/middlewares/rate-limiter.middleware";
import { type User } from "../../users/user.model";
import * as rewindServiceError from "../errors/rewind.service-error";

export async function consumeAiRecapDailyQuota(
	limiter: RateLimiterMemory,
	owner: Pick<User, "id" | "role">
): Promise<void> {
	if (!isRateLimitingActive() || isRateLimitExempt(owner.role)) return;
	try {
		await limiter.consume(`user:${owner.id}`);
	} catch (error) {
		throw rewindServiceError.aiRecapDailyLimitError(error);
	}
}
