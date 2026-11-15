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
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter),
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
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(ReplaceFavoritesSchema, "body")
	],
	favoritesController.putFavorites
);

router.get(
	"/game-ids",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter)
	],
	favoritesController.getMeFavoriteGameIds
);

router.get(
	"/",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(PaginatedSearchQuerySchema, "query")
	],
	favoritesController.getMeFavorites
);

router.get(
	"/export",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(ExportSearchQuerySchema, "query"),
		exportFormatNegotiationMiddleware,
		exportFormatAccessMiddleware
	],
	favoritesController.getMeFavoritesExport
);

export default router;
