import { Router } from "express";
import * as wishlistController from "./wishlist.controller";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { authMiddleware } from "../auth/auth.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { AddWishlistBodySchema } from "./schemas/add-wishlist-body.schema";
import { AddWishlistQuerySchema } from "./schemas/add-wishlist-query.schema";
import { ReplaceWishlistSchema } from "./schemas/replace-wishlist.schema";

const router = Router({ mergeParams: true });

router.post(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(AddWishlistQuerySchema, "query"),
		validateSchemaMiddleware(AddWishlistBodySchema, "body")
	],
	wishlistController.postWishlist
);

router.put(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(ReplaceWishlistSchema, "body")
	],
	wishlistController.putWishlist
);

router.get(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator")
	],
	wishlistController.getMeWishlist
);

export default router;
