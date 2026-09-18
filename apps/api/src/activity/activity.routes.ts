import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import * as activityController from "./activity.controller";
import { ActivityIdParamsSchema } from "./schemas/activity-id-params.schema";
import { FeedQuerySchema } from "./schemas/feed-query.schema";

const router = Router();

router.get(
	"/feed",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware(),
		validateSchemaMiddleware(FeedQuerySchema, "query")
	],
	activityController.getFeed
);

router.delete(
	"/feed/:activityId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware(),
		validateSchemaMiddleware(ActivityIdParamsSchema, "params")
	],
	activityController.deleteActivity
);

export default router;
