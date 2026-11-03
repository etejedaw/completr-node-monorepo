import { Router } from "express";
import { type ZodType } from "zod";

import { authMiddleware } from "../auth/auth.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { exportFormatAccessMiddleware } from "../common/middlewares/export-format-access.middleware";
import { exportFormatNegotiationMiddleware } from "../common/middlewares/export-format-negotiation.middleware";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateBulkBodyMiddleware } from "../common/middlewares/validate-bulk-body.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { ExportSearchQuerySchema } from "../common/schemas/export-search-query.schema";
import { PaginatedSearchQuerySchema } from "../common/schemas/paginated-search-query.schema";
import * as favoritesController from "./favorites.controller";
import { BulkFavoritesSchema } from "./schemas/bulk-favorites.schema";
import {
	type FavoritesBulkQuery,
	FavoritesBulkQuerySchema
} from "./schemas/favorites-bulk-query.schema";
import { ReplaceFavoritesSchema } from "./schemas/replace-favorites.schema";

const router = Router({ mergeParams: true });

router.post(
	"/bulk",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(FavoritesBulkQuerySchema, "query"),
		validateBulkBodyMiddleware({
			add: BulkFavoritesSchema,
			remove: BulkFavoritesSchema
		} satisfies Record<FavoritesBulkQuery["action"], ZodType>)
	],
	favoritesController.postFavoritesBulk
);

router.put(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(ReplaceFavoritesSchema, "body")
	],
	favoritesController.putFavorites
);

router.get(
	"/game-ids",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator")
	],
	favoritesController.getMeFavoriteGameIds
);

router.get(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(PaginatedSearchQuerySchema, "query")
	],
	favoritesController.getMeFavorites
);

router.get(
	"/export",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(ExportSearchQuerySchema, "query"),
		exportFormatNegotiationMiddleware,
		exportFormatAccessMiddleware
	],
	favoritesController.getMeFavoritesExport
);

export default router;
