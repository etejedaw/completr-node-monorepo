import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { ListIdParamsSchema } from "../lists/schemas/list-id-params.schema";
import * as listItemsController from "./list-items.controller";
import { AddListItemSchema } from "./schemas/add-list-item.schema";
import { ListItemGameParamsSchema } from "./schemas/list-item-game-params.schema";
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
	"/lists/:listId/items",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator", "admin"),
		validateSchemaMiddleware(ListIdParamsSchema, "params"),
		validateSchemaMiddleware(AddListItemSchema, "body")
	],
	listItemsController.postListItem
);

router.delete(
	"/lists/:listId/items/:gameId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator", "admin"),
		validateSchemaMiddleware(ListItemGameParamsSchema, "params")
	],
	listItemsController.deleteListItem
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
