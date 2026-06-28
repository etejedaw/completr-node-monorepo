import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import {
	publicLimiter,
	userLimiter
} from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { UsernameParamSchema } from "../users/schemas/username-params.schema";
import * as controller from "./user-followers.controller";

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
