import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { PaginationQuerySchema } from "../common/schemas/pagination-query.schema";
import { GameIdParamSchema } from "../games/schemas/game-id-params.schema";
import * as reviewsController from "./reviews.controller";
import { CreateReviewSchema } from "./schemas/create-review.schema";
import { UpdateReviewSchema } from "./schemas/update-review.schema";

const router = Router({ mergeParams: true });

router.post(
	"/",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(GameIdParamSchema, "params"),
		validateSchemaMiddleware(CreateReviewSchema, "body")
	],
	reviewsController.postReview
);

router.get(
	"/",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(GameIdParamSchema, "params"),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	reviewsController.getReviews
);

router.patch(
	"/",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(GameIdParamSchema, "params"),
		validateSchemaMiddleware(UpdateReviewSchema, "body")
	],
	reviewsController.patchReview
);

router.delete(
	"/",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(GameIdParamSchema, "params")
	],
	reviewsController.deleteReview
);

export default router;
