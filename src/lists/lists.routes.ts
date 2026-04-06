import { Router } from "express";
import * as listsController from "./lists.controller";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import {
	userLimiter,
	publicLimiter
} from "../common/config/rate-limiter.config";
import { authMiddleware } from "../auth/auth.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { RegisterListSchema } from "./schemas/register-list.schema";
import { UpdateListSchema } from "./schemas/update-list.schema";
import { ListIdParamsSchema } from "./schemas/list-id-params.schema";
import { authOptionalMiddleware } from "../auth/auth-optional.middleware";

const router = Router();

router.post(
	"/lists",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator", "admin"),
		validateSchemaMiddleware(RegisterListSchema, "body")
	],
	listsController.postList
);

router.get(
	"/lists/me",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator", "admin")
	],
	listsController.getMeLists
);

router.get(
	"/lists/:listId",
	[
		rateLimiterMiddleware(publicLimiter),
		authOptionalMiddleware,
		validateSchemaMiddleware(ListIdParamsSchema, "params")
	],
	listsController.getListById
);

router.patch(
	"/lists/:listId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator", "admin"),
		validateSchemaMiddleware(ListIdParamsSchema, "params"),
		validateSchemaMiddleware(UpdateListSchema, "body")
	],
	listsController.patchList
);

router.delete(
	"/lists/:listId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator", "admin"),
		validateSchemaMiddleware(ListIdParamsSchema, "params")
	],
	listsController.deleteList
);

export default router;
