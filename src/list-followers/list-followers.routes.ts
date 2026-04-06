import { Router } from "express";
import * as listFollowersController from "./list-followers.controller";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { authMiddleware } from "../auth/auth.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { ListIdParamsSchema } from "../lists/schemas/list-id-params.schema";

const router = Router();

router.post(
	"/lists/:listId/follow",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator", "admin"),
		validateSchemaMiddleware(ListIdParamsSchema, "params")
	],
	listFollowersController.postFollow
);

router.delete(
	"/lists/:listId/follow",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator", "admin"),
		validateSchemaMiddleware(ListIdParamsSchema, "params")
	],
	listFollowersController.deleteFollow
);

export default router;
