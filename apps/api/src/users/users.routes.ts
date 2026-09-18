import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { authOptionalMiddleware } from "../auth/auth-optional.middleware";
import { hiddenRouteMiddleware } from "../auth/hidden-route.middleware";
import { RegisterSchema } from "../auth/schemas";
import * as backlogController from "../backlog/backlog.controller";
import backlogRouter from "../backlog/backlog.routes";
import { BacklogQuerySchema } from "../backlog/schemas/backlog-query.schema";
import {
	publicLimiter,
	registerLimiter,
	userLimiter
} from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { PaginationQuerySchema } from "../common/schemas/pagination-query.schema";
import * as favoritesController from "../favorites/favorites.controller";
import favoritesRouter from "../favorites/favorites.routes";
import * as gameShelfController from "../game-shelf/game-shelf.controller";
import gameShelfRouter from "../game-shelf/game-shelf.routes";
import * as queueController from "../queue/queue.controller";
import queueRouter from "../queue/queue.routes";
import savedFiltersRouter from "../saved-filters/saved-filters.routes";
import * as wishlistController from "../wishlist/wishlist.controller";
import wishlistRouter from "../wishlist/wishlist.routes";
import {
	ComparisonQuerySchema,
	HighlightsQuerySchema,
	UpdateUserSchema,
	UsernameParamSchema
} from "./schemas";
import { AdminUpdateUserSchema } from "./schemas/admin-update-user.schema";
import { UserDiscoverQuerySchema } from "./schemas/user-discover-query.schema";
import { UserIdParamSchema } from "./schemas/user-id-params.schema";
import { UserSearchQuerySchema } from "./schemas/user-search-query.schema";
import { UsernameListParamsSchema } from "./schemas/username-list-params.schema";
import * as usersController from "./users.controller";
import * as usersAdminController from "./users-admin.controller";

const router = Router();

router.post(
	"/admin/users",
	[
		rateLimiterMiddleware(registerLimiter),
		hiddenRouteMiddleware(),
		validateSchemaMiddleware(RegisterSchema, "body")
	],
	usersAdminController.postAdminCreateUser
);

router.get(
	"/admin/users",
	[
		rateLimiterMiddleware(userLimiter),
		hiddenRouteMiddleware(),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	usersAdminController.getAdminUsers
);

router.patch(
	"/admin/users/:userId",
	[
		rateLimiterMiddleware(userLimiter),
		hiddenRouteMiddleware(),
		validateSchemaMiddleware(UserIdParamSchema, "params"),
		validateSchemaMiddleware(AdminUpdateUserSchema, "body")
	],
	usersAdminController.patchAdminUser
);

router.get(
	"/users/me",
	[rateLimiterMiddleware(userLimiter), authMiddleware()],
	usersController.getUserMe
);

router.get(
	"/users/search",
	[
		rateLimiterMiddleware(publicLimiter),
		authMiddleware(),
		validateSchemaMiddleware(UserSearchQuerySchema, "query")
	],
	usersController.searchUsers
);

router.get(
	"/users/discover",
	[
		rateLimiterMiddleware(publicLimiter),
		authOptionalMiddleware,
		validateSchemaMiddleware(UserDiscoverQuerySchema, "query")
	],
	usersController.getDiscoverUsers
);

router.get(
	"/users/:username",
	[
		rateLimiterMiddleware(publicLimiter),
		authOptionalMiddleware,
		validateSchemaMiddleware(UsernameParamSchema, "params")
	],
	usersController.getUserByUsername
);

router.patch(
	"/users/me",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware(),
		validateSchemaMiddleware(UpdateUserSchema, "body")
	],
	usersController.patchUser
);

router.delete(
	"/users/me/deactivate",
	[rateLimiterMiddleware(userLimiter), authMiddleware()],
	usersController.deleteUser
);

router.use("/users/me/game-shelf", gameShelfRouter);

router.get(
	"/users/:username/game-shelf",
	[
		rateLimiterMiddleware(publicLimiter),
		authOptionalMiddleware,
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	gameShelfController.getUserGameShelf
);

router.use("/users/me/backlog", backlogRouter);

router.get(
	"/users/:username/backlog",
	[
		rateLimiterMiddleware(publicLimiter),
		authOptionalMiddleware,
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(BacklogQuerySchema, "query")
	],
	backlogController.getUserBacklog
);

router.use("/users/me/saved-filters", savedFiltersRouter);

router.use("/users/me/queue", queueRouter);

router.get(
	"/users/:username/queue",
	[
		rateLimiterMiddleware(publicLimiter),
		authOptionalMiddleware,
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	queueController.getUserQueue
);

router.use("/users/me/wishlist", wishlistRouter);

router.get(
	"/users/:username/wishlist",
	[
		rateLimiterMiddleware(publicLimiter),
		authOptionalMiddleware,
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	wishlistController.getUserWishlist
);

router.use("/users/me/favorites", favoritesRouter);

router.get(
	"/users/:username/favorites",
	[
		rateLimiterMiddleware(publicLimiter),
		authOptionalMiddleware,
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	favoritesController.getUserFavorites
);

router.get(
	"/users/:username/lists",
	[
		rateLimiterMiddleware(publicLimiter),
		authOptionalMiddleware,
		validateSchemaMiddleware(UsernameParamSchema, "params")
	],
	usersController.getUserLists
);

router.get(
	"/users/:username/following-lists",
	[
		rateLimiterMiddleware(publicLimiter),
		authOptionalMiddleware,
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	usersController.getUserFollowingLists
);

router.get(
	"/users/:username/reviews",
	[
		rateLimiterMiddleware(publicLimiter),
		authOptionalMiddleware,
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	usersController.getUserReviews
);

router.get(
	"/users/:username/lists/:listId",
	[
		authOptionalMiddleware,
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(UsernameListParamsSchema, "params")
	],
	usersController.getUserListDetail
);

router.get(
	"/users/:username/highlights",
	[
		rateLimiterMiddleware(publicLimiter),
		authOptionalMiddleware,
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(HighlightsQuerySchema, "query")
	],
	usersController.getUserHighlights
);

router.get(
	"/users/:username/completions",
	[
		rateLimiterMiddleware(publicLimiter),
		authOptionalMiddleware,
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	usersController.getUserCompletions
);

router.get(
	"/users/:username/franchises",
	[
		rateLimiterMiddleware(publicLimiter),
		authOptionalMiddleware,
		validateSchemaMiddleware(UsernameParamSchema, "params")
	],
	usersController.getUserFranchises
);

router.get(
	"/users/:username/comparison",
	[
		rateLimiterMiddleware(publicLimiter),
		authMiddleware(),
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(ComparisonQuerySchema, "query")
	],
	usersController.getUserComparison
);

export default router;
