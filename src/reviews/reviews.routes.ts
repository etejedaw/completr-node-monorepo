import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { GameIdParamSchema } from "../games/schemas/game-id-params.schema";
import * as reviewsController from "./reviews.controller";
import { CreateReviewSchema } from "./schemas/create-review.schema";
import { UpdateReviewSchema } from "./schemas/update-review.schema";

const router = Router({ mergeParams: true });

router.post(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(GameIdParamSchema, "params"),
		validateSchemaMiddleware(CreateReviewSchema, "body")
	],
	reviewsController.postReview
);

router.get(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(GameIdParamSchema, "params")
	],
	reviewsController.getReviews
);

router.patch(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(GameIdParamSchema, "params"),
		validateSchemaMiddleware(UpdateReviewSchema, "body")
	],
	reviewsController.patchReview
);

router.delete(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(GameIdParamSchema, "params")
	],
	reviewsController.deleteReview
);

export default router;
