import { Router } from "express";
import * as favoritesController from "./favorites.controller";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { authMiddleware } from "../auth/auth.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { ReplaceFavoritesSchema } from "./schemas/replace-favorites.schema";
import { PaginatedSearchQuerySchema } from "../common/schemas/paginated-search-query.schema";

const router = Router({ mergeParams: true });

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
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(PaginatedSearchQuerySchema, "query")
	],
	favoritesController.getMeFavorites
);

export default router;
