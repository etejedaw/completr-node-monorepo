import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { PaginatedSearchQuerySchema } from "../common/schemas/paginated-search-query.schema";
import * as savedFiltersController from "./saved-filters.controller";
import { RegisterSavedFilterSchema } from "./schemas/register-saved-filter.schema";
import { ReorderSavedFiltersSchema } from "./schemas/reorder-saved-filters.schema";
import { SavedFilterIdParamsSchema } from "./schemas/saved-filter-id-params.schema";
import { UpdateSavedFilterSchema } from "./schemas/update-saved-filter.schema";

const router = Router({ mergeParams: true });

router.post(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(RegisterSavedFilterSchema, "body")
	],
	savedFiltersController.postSavedFilter
);

router.get(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(PaginatedSearchQuerySchema, "query")
	],
	savedFiltersController.getMeSavedFilters
);

router.put(
	"/reorder",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(ReorderSavedFiltersSchema, "body")
	],
	savedFiltersController.putReorderSavedFilters
);

router.get(
	"/:filterId/stats",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(SavedFilterIdParamsSchema, "params")
	],
	savedFiltersController.getSavedFilterStats
);

router.patch(
	"/:filterId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(SavedFilterIdParamsSchema, "params"),
		validateSchemaMiddleware(UpdateSavedFilterSchema, "body")
	],
	savedFiltersController.patchSavedFilter
);

router.delete(
	"/:filterId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(SavedFilterIdParamsSchema, "params")
	],
	savedFiltersController.deleteSavedFilter
);

export default router;
