import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { exportFormatAccessMiddleware } from "../common/middlewares/export-format-access.middleware";
import { exportFormatNegotiationMiddleware } from "../common/middlewares/export-format-negotiation.middleware";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { AddWishlistSchema } from "./schemas/add-wishlist.schema";
import { ReplaceWishlistSchema } from "./schemas/replace-wishlist.schema";
import { WishlistExportQuerySchema } from "./schemas/wishlist-export-query.schema";
import { WishlistGameParamsSchema } from "./schemas/wishlist-game-params.schema";
import { WishlistQuerySchema } from "./schemas/wishlist-query.schema";
import * as wishlistController from "./wishlist.controller";

const router = Router({ mergeParams: true });

router.put(
	"/",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(ReplaceWishlistSchema, "body")
	],
	wishlistController.putWishlist
);

router.post(
	"/",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(AddWishlistSchema, "body")
	],
	wishlistController.postWishlist
);

router.delete(
	"/:gameId",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(WishlistGameParamsSchema, "params")
	],
	wishlistController.deleteWishlistItem
);

router.get(
	"/game-ids",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter)
	],
	wishlistController.getMeWishlistGameIds
);

router.get(
	"/",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(WishlistQuerySchema, "query")
	],
	wishlistController.getMeWishlist
);

router.get(
	"/export",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(WishlistExportQuerySchema, "query"),
		exportFormatNegotiationMiddleware,
		exportFormatAccessMiddleware
	],
	wishlistController.getMeWishlistExport
);

export default router;
