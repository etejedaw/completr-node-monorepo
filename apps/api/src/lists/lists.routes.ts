import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import {
	publicLimiter,
	userLimiter
} from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { PaginationQuerySchema } from "../common/schemas/pagination-query.schema";
import { SearchQuerySchema } from "../common/schemas/search-query.schema";
import * as listsController from "./lists.controller";
import { DuplicateListSchema } from "./schemas/duplicate-list.schema";
import { ListIdParamsSchema } from "./schemas/list-id-params.schema";
import { RegisterListSchema } from "./schemas/register-list.schema";
import { UpdateListSchema } from "./schemas/update-list.schema";

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

router.post(
	"/lists/:listId/duplicate",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator", "admin"),
		validateSchemaMiddleware(ListIdParamsSchema, "params"),
		validateSchemaMiddleware(DuplicateListSchema, "body")
	],
	listsController.postDuplicateList
);

router.get(
	"/lists/me",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator", "admin"),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	listsController.getMeLists
);

router.get(
	"/lists/official",
	[rateLimiterMiddleware(publicLimiter), authMiddleware()],
	listsController.getOfficialLists
);

router.get(
	"/lists/recent",
	[rateLimiterMiddleware(publicLimiter), authMiddleware()],
	listsController.getRecentLists
);

router.get(
	"/lists/search",
	[
		rateLimiterMiddleware(publicLimiter),
		authMiddleware(),
		validateSchemaMiddleware(SearchQuerySchema, "query")
	],
	listsController.searchLists
);

router.get(
	"/lists/:listId",
	[
		rateLimiterMiddleware(publicLimiter),
		authMiddleware(),
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
