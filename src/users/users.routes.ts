import { Router } from "express";
import * as usersController from "./users.controller";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { UpdateUserSchema, UsernameParamSchema } from "./schemas";
import { authMiddleware } from "../auth/auth.middleware";
import {
	publicLimiter,
	userLimiter
} from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import gameShelfRouter from "../game-shelf/game-shelf.routes";
import * as gameShelfController from "../game-shelf/game-shelf.controller";
import backlogRouter from "../backlog/backlog.routes";
import * as backlogController from "../backlog/backlog.controller";
import savedFiltersRouter from "../saved-filters/saved-filters.routes";

const router = Router();

router.get(
	"/users/me",
	[rateLimiterMiddleware(userLimiter), authMiddleware()],
	usersController.getUserMe
);

router.get(
	"/users/:username",
	[
		rateLimiterMiddleware(publicLimiter),
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
		validateSchemaMiddleware(UsernameParamSchema, "params")
	],
	gameShelfController.getUserGameShelf
);

router.use("/users/me/backlog", backlogRouter);

router.get(
	"/users/:username/backlog",
	[
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(UsernameParamSchema, "params")
	],
	backlogController.getUserBacklog
);

router.use("/users/me/saved-filters", savedFiltersRouter);

export default router;
