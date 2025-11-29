import { Router } from "express";
import * as usersController from "./users.controller";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { UpdateUserSchema, UsernameParamsSchema } from "./schemas";
import { authMiddleware } from "../auth/auth.middleware";
import {
	publicLimiter,
	userLimiter
} from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";

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
		validateSchemaMiddleware(UsernameParamsSchema, "params")
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

export default router;
