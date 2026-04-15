import { Router } from "express";
import * as scoreSourcesController from "./score-sources.controller";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import {
	publicLimiter,
	userLimiter
} from "../common/config/rate-limiter.config";
import { authMiddleware } from "../auth/auth.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { RegisterScoreSourceSchema } from "./score-sources.schema";

const router = Router();

router.get(
	"/score-sources",
	[rateLimiterMiddleware(publicLimiter), authMiddleware()],
	scoreSourcesController.getScoreSources
);

router.post(
	"/score-sources",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("admin"),
		validateSchemaMiddleware(RegisterScoreSourceSchema, "body")
	],
	scoreSourcesController.postScoreSource
);

export default router;
