import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import {
	publicLimiter,
	userLimiter
} from "../common/config/rate-limiter.config";
import { exportFormatAccessMiddleware } from "../common/middlewares/export-format-access.middleware";
import { exportFormatNegotiationMiddleware } from "../common/middlewares/export-format-negotiation.middleware";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { PaginationQuerySchema } from "../common/schemas/pagination-query.schema";
import { SearchQuerySchema } from "../common/schemas/search-query.schema";
import * as listsController from "./lists.controller";
import { DiscoveryQuerySchema } from "./schemas/discovery-query.schema";
import { DuplicateListSchema } from "./schemas/duplicate-list.schema";
import { ListIdParamsSchema } from "./schemas/list-id-params.schema";
import { RegisterListSchema } from "./schemas/register-list.schema";
import { UpdateListSchema } from "./schemas/update-list.schema";

const router = Router();

router.post(
	"/lists",
	[
		authMiddleware("user", "premium", "moderator", "admin"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(RegisterListSchema, "body")
	],
	listsController.postList
);

router.post(
	"/lists/:listId/duplicate",
	[
		authMiddleware("user", "premium", "moderator", "admin"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(ListIdParamsSchema, "params"),
		validateSchemaMiddleware(DuplicateListSchema, "body")
	],
	listsController.postDuplicateList
);

router.get(
	"/lists/me",
	[
		authMiddleware("user", "premium", "moderator", "admin"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	listsController.getMeLists
);

router.get(
	"/lists/official",
	[
		authMiddleware(),
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(DiscoveryQuerySchema, "query")
	],
	listsController.getOfficialLists
);

router.get(
	"/lists/recent",
	[
		authMiddleware(),
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(DiscoveryQuerySchema, "query")
	],
	listsController.getRecentLists
);

router.get(
	"/lists/search",
	[
		authMiddleware(),
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(SearchQuerySchema, "query")
	],
	listsController.searchLists
);

router.get(
	"/lists/:listId",
	[
		authMiddleware(),
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(ListIdParamsSchema, "params")
	],
	listsController.getListById
);

router.get(
	"/lists/:listId/export",
	[
		authMiddleware("user", "premium", "moderator", "admin"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(ListIdParamsSchema, "params"),
		exportFormatNegotiationMiddleware,
		exportFormatAccessMiddleware
	],
	listsController.getListExport
);

router.patch(
	"/lists/:listId",
	[
		authMiddleware("user", "premium", "moderator", "admin"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(ListIdParamsSchema, "params"),
		validateSchemaMiddleware(UpdateListSchema, "body")
	],
	listsController.patchList
);

router.delete(
	"/lists/:listId",
	[
		authMiddleware("user", "premium", "moderator", "admin"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(ListIdParamsSchema, "params")
	],
	listsController.deleteList
);

export default router;
