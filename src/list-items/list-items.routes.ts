import { Router } from "express";
import * as listItemsController from "./list-items.controller";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { authMiddleware } from "../auth/auth.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { ListIdParamsSchema } from "../lists/schemas/list-id-params.schema";
import { AddListItemSchema } from "./schemas/add-list-item.schema";
import { UpdateListItemSchema } from "./schemas/update-list-item.schema";
import { ListItemIdParamsSchema } from "./schemas/list-item-id-params.schema";

const router = Router();

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

router.patch(
	"/lists/:listId/items/:itemId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator", "admin"),
		validateSchemaMiddleware(ListItemIdParamsSchema, "params"),
		validateSchemaMiddleware(UpdateListItemSchema, "body")
	],
	listItemsController.patchListItem
);

router.delete(
	"/lists/:listId/items/:itemId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator", "admin"),
		validateSchemaMiddleware(ListItemIdParamsSchema, "params")
	],
	listItemsController.deleteListItem
);

export default router;
