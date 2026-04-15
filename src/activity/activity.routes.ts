import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { ActivityIdParamsSchema } from "./schemas/activity-id-params.schema";
import * as activityController from "./activity.controller";

const router = Router();

router.get(
	"/feed",
	[rateLimiterMiddleware(userLimiter), authMiddleware()],
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
