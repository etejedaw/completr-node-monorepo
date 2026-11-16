import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { authOptionalMiddleware } from "../auth/auth-optional.middleware";
import { publicLimiter } from "../common/config/rate-limiter.config";
import {
	rateLimiterMiddleware,
	resolveUserRateLimitKey
} from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { UsernameParamSchema } from "../users/schemas/username-params.schema";
import * as rewindController from "./rewind.controller";
import { rewindGenerationLimiter } from "./rewind-rate-limiter.config";
import { AddRewindAiRecapSchema } from "./schemas/add-rewind-ai-recap.schema";
import { GenerateRewindSchema } from "./schemas/generate-rewind.schema";
import { OwnRewindYearParamsSchema } from "./schemas/own-rewind-year-params.schema";
import { RewindYearParamsSchema } from "./schemas/rewind-year-params.schema";

const router = Router();

router.get(
	"/users/:username/rewinds",
	[
		authOptionalMiddleware,
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(UsernameParamSchema, "params")
	],
	rewindController.getUserRewinds
);

router.get(
	"/users/:username/rewinds/:year",
	[
		authOptionalMiddleware,
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(RewindYearParamsSchema, "params")
	],
	rewindController.getUserRewind
);

router.post(
	"/users/me/rewinds/:year",
	[
		authMiddleware("user", "premium", "moderator", "admin"),
		rateLimiterMiddleware(rewindGenerationLimiter, resolveUserRateLimitKey),
		validateSchemaMiddleware(OwnRewindYearParamsSchema, "params"),
		validateSchemaMiddleware(GenerateRewindSchema, "body")
	],
	rewindController.postOwnRewind
);

router.post(
	"/users/me/rewinds/:year/ai-recap",
	[
		authMiddleware("user", "premium", "moderator", "admin"),
		rateLimiterMiddleware(rewindGenerationLimiter, resolveUserRateLimitKey),
		validateSchemaMiddleware(OwnRewindYearParamsSchema, "params"),
		validateSchemaMiddleware(AddRewindAiRecapSchema, "body")
	],
	rewindController.postOwnRewindAiRecap
);

export default router;
