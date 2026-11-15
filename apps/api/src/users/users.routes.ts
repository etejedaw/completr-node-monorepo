import { Router } from "express";
import { type ZodType } from "zod";

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
import { exportFormatAccessMiddleware } from "../common/middlewares/export-format-access.middleware";
import { exportFormatNegotiationMiddleware } from "../common/middlewares/export-format-negotiation.middleware";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateBulkBodyMiddleware } from "../common/middlewares/validate-bulk-body.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { ExportPlatformSearchQuerySchema } from "../common/schemas/export-platform-search-query.schema";
import { PaginatedSearchQuerySchema } from "../common/schemas/paginated-search-query.schema";
import { PaginationQuerySchema } from "../common/schemas/pagination-query.schema";
import * as favoritesController from "../favorites/favorites.controller";
import favoritesRouter from "../favorites/favorites.routes";
import * as gamePlatinumController from "../game-platinum/game-platinum.controller";
import { BulkDeletePlatinumsSchema } from "../game-platinum/schemas/bulk-delete-platinums.schema";
import {
	type PlatinumsBulkQuery,
	PlatinumsBulkQuerySchema
} from "../game-platinum/schemas/platinums-bulk-query.schema";
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
import { AdminUsersQuerySchema } from "./schemas/admin-users-query.schema";
import { UserDiscoverQuerySchema } from "./schemas/user-discover-query.schema";
import { UserIdParamSchema } from "./schemas/user-id-params.schema";
import { UserListsQuerySchema } from "./schemas/user-lists-query.schema";
import { UserSearchQuerySchema } from "./schemas/user-search-query.schema";
import { UsernameListParamsSchema } from "./schemas/username-list-params.schema";
import * as usersController from "./users.controller";
import * as usersAdminController from "./users-admin.controller";

const router = Router();

router.post(
	"/admin/users",
	[
		hiddenRouteMiddleware(),
		rateLimiterMiddleware(registerLimiter),
		validateSchemaMiddleware(RegisterSchema, "body")
	],
	usersAdminController.postAdminCreateUser
);

router.get(
	"/admin/users",
	[
		hiddenRouteMiddleware(),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(AdminUsersQuerySchema, "query")
	],
	usersAdminController.getAdminUsers
);

router.patch(
	"/admin/users/:userId",
	[
		hiddenRouteMiddleware(),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(UserIdParamSchema, "params"),
		validateSchemaMiddleware(AdminUpdateUserSchema, "body")
	],
	usersAdminController.patchAdminUser
);

router.delete(
	"/admin/users/:userId",
	[
		hiddenRouteMiddleware(),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(UserIdParamSchema, "params")
	],
	usersAdminController.deleteAdminUser
);

router.get(
	"/admin/users/:userId/data-export",
	[
		hiddenRouteMiddleware(),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(UserIdParamSchema, "params")
	],
	usersAdminController.getAdminUserDataExport
);

router.get(
	"/users/me",
	[authMiddleware(), rateLimiterMiddleware(userLimiter)],
	usersController.getUserMe
);

router.get(
	"/users/search",
	[
		authMiddleware(),
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(UserSearchQuerySchema, "query")
	],
	usersController.searchUsers
);

router.get(
	"/users/discover",
	[
		authOptionalMiddleware,
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(UserDiscoverQuerySchema, "query")
	],
	usersController.getDiscoverUsers
);

router.get(
	"/users/:username",
	[
		authOptionalMiddleware,
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(UsernameParamSchema, "params")
	],
	usersController.getUserByUsername
);

router.patch(
	"/users/me",
	[
		authMiddleware(),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(UpdateUserSchema, "body")
	],
	usersController.patchUser
);

router.delete(
	"/users/me/deactivate",
	[authMiddleware(), rateLimiterMiddleware(userLimiter)],
	usersController.deleteUser
);

router.use("/users/me/game-shelf", gameShelfRouter);

router.get(
	"/users/:username/game-shelf",
	[
		authOptionalMiddleware,
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	gameShelfController.getUserGameShelf
);

router.use("/users/me/backlog", backlogRouter);

router.get(
	"/users/:username/backlog",
	[
		authOptionalMiddleware,
		rateLimiterMiddleware(publicLimiter),
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
		authOptionalMiddleware,
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	queueController.getUserQueue
);

router.use("/users/me/wishlist", wishlistRouter);

router.get(
	"/users/:username/wishlist",
	[
		authOptionalMiddleware,
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	wishlistController.getUserWishlist
);

router.use("/users/me/favorites", favoritesRouter);

router.get(
	"/users/:username/favorites",
	[
		authOptionalMiddleware,
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	favoritesController.getUserFavorites
);

router.post(
	"/users/me/platinums/bulk",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(PlatinumsBulkQuerySchema, "query"),
		validateBulkBodyMiddleware({
			delete: BulkDeletePlatinumsSchema
		} satisfies Record<PlatinumsBulkQuery["action"], ZodType>)
	],
	gamePlatinumController.postPlatinumsBulk
);

router.get(
	"/users/me/platinums",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(PaginatedSearchQuerySchema, "query")
	],
	gamePlatinumController.getMyPlatinums
);

router.get(
	"/users/me/platinums/export",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(ExportPlatformSearchQuerySchema, "query"),
		exportFormatNegotiationMiddleware,
		exportFormatAccessMiddleware
	],
	gamePlatinumController.getMyPlatinumsExport
);

router.get(
	"/users/:username/platinums",
	[
		authOptionalMiddleware,
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(PaginatedSearchQuerySchema, "query")
	],
	gamePlatinumController.getUserPlatinums
);

router.get(
	"/users/:username/lists",
	[
		authOptionalMiddleware,
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(UserListsQuerySchema, "query")
	],
	usersController.getUserLists
);

router.get(
	"/users/:username/following-lists",
	[
		authOptionalMiddleware,
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(UserListsQuerySchema, "query")
	],
	usersController.getUserFollowingLists
);

router.get(
	"/users/:username/reviews",
	[
		authOptionalMiddleware,
		rateLimiterMiddleware(publicLimiter),
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
		authOptionalMiddleware,
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(HighlightsQuerySchema, "query")
	],
	usersController.getUserHighlights
);

router.get(
	"/users/:username/completions",
	[
		authOptionalMiddleware,
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	usersController.getUserCompletions
);

router.get(
	"/users/:username/franchises",
	[
		authOptionalMiddleware,
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(UsernameParamSchema, "params")
	],
	usersController.getUserFranchises
);

router.get(
	"/users/:username/comparison",
	[
		authMiddleware(),
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(ComparisonQuerySchema, "query")
	],
	usersController.getUserComparison
);

export default router;
