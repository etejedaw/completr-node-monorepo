import { Router } from "express";
import * as savedFiltersController from "./saved-filters.controller";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { authMiddleware } from "../auth/auth.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { RegisterSavedFilterSchema } from "./schemas/register-saved-filter.schema";
import { UpdateSavedFilterSchema } from "./schemas/update-saved-filter.schema";
import { SavedFilterIdParamsSchema } from "./schemas/saved-filter-id-params.schema";
import { PaginatedSearchQuerySchema } from "../common/schemas/paginated-search-query.schema";

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
