import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { PaginatedSearchQuerySchema } from "../common/schemas/paginated-search-query.schema";
import { AddWishlistSchema } from "./schemas/add-wishlist.schema";
import { ReplaceWishlistSchema } from "./schemas/replace-wishlist.schema";
import { WishlistGameParamsSchema } from "./schemas/wishlist-game-params.schema";
import * as wishlistController from "./wishlist.controller";

const router = Router({ mergeParams: true });

router.put(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(ReplaceWishlistSchema, "body")
	],
	wishlistController.putWishlist
);

router.post(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(AddWishlistSchema, "body")
	],
	wishlistController.postWishlist
);

router.delete(
	"/:gameId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(WishlistGameParamsSchema, "params")
	],
	wishlistController.deleteWishlistItem
);

router.get(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(PaginatedSearchQuerySchema, "query")
	],
	wishlistController.getMeWishlist
);

export default router;
