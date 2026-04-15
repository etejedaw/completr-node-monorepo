import { Router } from "express";
import * as controller from "./user-followers.controller";
import { authMiddleware } from "../auth/auth.middleware";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import {
	publicLimiter,
	userLimiter
} from "../common/config/rate-limiter.config";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { UsernameParamSchema } from "../users/schemas/username-params.schema";

const router = Router();

router.post(
	"/users/:username/follow",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware(),
		validateSchemaMiddleware(UsernameParamSchema, "params")
	],
	controller.postFollow
);

router.delete(
	"/users/:username/follow",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware(),
		validateSchemaMiddleware(UsernameParamSchema, "params")
	],
	controller.deleteFollow
);

router.get(
	"/users/:username/followers",
	[
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(UsernameParamSchema, "params")
	],
	controller.getFollowers
);

router.get(
	"/users/:username/following",
	[
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(UsernameParamSchema, "params")
	],
	controller.getFollowing
);

export default router;
