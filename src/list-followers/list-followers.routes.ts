import { Router } from "express";
import * as listFollowersController from "./list-followers.controller";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import {
	publicLimiter,
	userLimiter
} from "../common/config/rate-limiter.config";
import { authMiddleware } from "../auth/auth.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { ListIdParamsSchema } from "../lists/schemas/list-id-params.schema";
import { UpdateFollowVisibilitySchema } from "./schemas/update-follow-visibility.schema";

const router = Router();

router.post(
	"/lists/:listId/follow",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware(),
		validateSchemaMiddleware(ListIdParamsSchema, "params")
	],
	listFollowersController.postFollow
);

router.delete(
	"/lists/:listId/follow",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware(),
		validateSchemaMiddleware(ListIdParamsSchema, "params")
	],
	listFollowersController.deleteFollow
);

router.get(
	"/lists/:listId/followers",
	[
		rateLimiterMiddleware(publicLimiter),
		authMiddleware(),
		validateSchemaMiddleware(ListIdParamsSchema, "params")
	],
	listFollowersController.getFollowers
);

router.get(
	"/lists/following",
	[rateLimiterMiddleware(userLimiter), authMiddleware()],
	listFollowersController.getFollowing
);

router.patch(
	"/lists/:listId/follow",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware(),
		validateSchemaMiddleware(ListIdParamsSchema, "params"),
		validateSchemaMiddleware(UpdateFollowVisibilitySchema, "body")
	],
	listFollowersController.patchVisibility
);

export default router;
