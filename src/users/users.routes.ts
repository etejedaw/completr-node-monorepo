import { Router } from "express";
import * as usersController from "./users.controller";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { UpdateUserSchema, UsernameParamSchema } from "./schemas";
import { RegisterSchema } from "../auth/schemas";
import { SearchQuerySchema } from "../common/schemas/search-query.schema";
import { authMiddleware } from "../auth/auth.middleware";
import { authOptionalMiddleware } from "../auth/auth-optional.middleware";
import { hiddenRouteMiddleware } from "../auth/hidden-route.middleware";
import {
	publicLimiter,
	registerLimiter,
	userLimiter
} from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import gameShelfRouter from "../game-shelf/game-shelf.routes";
import * as gameShelfController from "../game-shelf/game-shelf.controller";
import backlogRouter from "../backlog/backlog.routes";
import * as backlogController from "../backlog/backlog.controller";
import { BacklogQuerySchema } from "../backlog/schemas/backlog-query.schema";
import { PaginationQuerySchema } from "../common/schemas/pagination-query.schema";
import { UserIdParamSchema } from "./schemas/user-id-params.schema";
import { AdminUpdateUserSchema } from "./schemas/admin-update-user.schema";
import { UsernameListParamsSchema } from "./schemas/username-list-params.schema";
import savedFiltersRouter from "../saved-filters/saved-filters.routes";
import wishlistRouter from "../wishlist/wishlist.routes";
import * as wishlistController from "../wishlist/wishlist.controller";
import favoritesRouter from "../favorites/favorites.routes";
import * as favoritesController from "../favorites/favorites.controller";

const router = Router();

router.post(
	"/admin/users",
	[
		rateLimiterMiddleware(registerLimiter),
		hiddenRouteMiddleware(),
		validateSchemaMiddleware(RegisterSchema, "body")
	],
	usersController.postAdminCreateUser
);

router.get(
	"/admin/users",
	[
		rateLimiterMiddleware(userLimiter),
		hiddenRouteMiddleware(),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	usersController.getAdminUsers
);

router.patch(
	"/admin/users/:userId",
	[
		rateLimiterMiddleware(userLimiter),
		hiddenRouteMiddleware(),
		validateSchemaMiddleware(UserIdParamSchema, "params"),
		validateSchemaMiddleware(AdminUpdateUserSchema, "body")
	],
	usersController.patchAdminUser
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
		validateSchemaMiddleware(SearchQuerySchema, "query")
	],
	usersController.searchUsers
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
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(BacklogQuerySchema, "query")
	],
	backlogController.getUserBacklog
);

router.use("/users/me/saved-filters", savedFiltersRouter);

router.use("/users/me/wishlist", wishlistRouter);

router.get(
	"/users/:username/wishlist",
	[
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
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	favoritesController.getUserFavorites
);

router.get(
	"/users/:username/following-lists",
	[
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(UsernameParamSchema, "params"),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	usersController.getUserFollowingLists
);

router.get(
	"/users/:username/reviews",
	[
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

export default router;
