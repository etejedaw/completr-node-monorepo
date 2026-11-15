import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import {
	publicLimiter,
	userLimiter
} from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { PaginationQuerySchema } from "../common/schemas/pagination-query.schema";
import { ListIdParamsSchema } from "../lists/schemas/list-id-params.schema";
import * as listFollowersController from "./list-followers.controller";
import { UpdateFollowVisibilitySchema } from "./update-follow-visibility.schema";

const router = Router();

router.post(
	"/lists/:listId/follow",
	[
		authMiddleware(),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(ListIdParamsSchema, "params")
	],
	listFollowersController.postFollow
);

router.delete(
	"/lists/:listId/follow",
	[
		authMiddleware(),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(ListIdParamsSchema, "params")
	],
	listFollowersController.deleteFollow
);

router.get(
	"/lists/:listId/followers",
	[
		authMiddleware(),
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(ListIdParamsSchema, "params"),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	listFollowersController.getFollowers
);

router.get(
	"/lists/following",
	[authMiddleware(), rateLimiterMiddleware(userLimiter)],
	listFollowersController.getFollowing
);

router.patch(
	"/lists/:listId/follow",
	[
		authMiddleware(),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(ListIdParamsSchema, "params"),
		validateSchemaMiddleware(UpdateFollowVisibilitySchema, "body")
	],
	listFollowersController.patchVisibility
);

export default router;
