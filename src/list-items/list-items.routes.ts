import { Router } from "express";
import * as listItemsController from "./list-items.controller";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { authMiddleware } from "../auth/auth.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { ListIdParamsSchema } from "../lists/schemas/list-id-params.schema";
import { ReplaceListItemsSchema } from "./schemas/replace-list-items.schema";

const router = Router();

router.put(
	"/lists/:listId/items",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator", "admin"),
		validateSchemaMiddleware(ListIdParamsSchema, "params"),
		validateSchemaMiddleware(ReplaceListItemsSchema, "body")
	],
	listItemsController.putListItems
);

router.post(
	"/lists/:listId/refresh-scores",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator", "admin"),
		validateSchemaMiddleware(ListIdParamsSchema, "params")
	],
	listItemsController.postRefreshScores
);

export default router;
