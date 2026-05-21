import { Router } from "express";
import * as queueController from "./queue.controller";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { authMiddleware } from "../auth/auth.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { AddQueueBodySchema } from "./schemas/add-queue-body.schema";
import { AddQueueQuerySchema } from "./schemas/add-queue-query.schema";
import { ReplaceQueueSchema } from "./schemas/replace-queue.schema";
import { PaginatedSearchQuerySchema } from "../common/schemas/paginated-search-query.schema";

const router = Router({ mergeParams: true });

router.post(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(AddQueueQuerySchema, "query"),
		validateSchemaMiddleware(AddQueueBodySchema, "body")
	],
	queueController.postQueue
);

router.put(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(ReplaceQueueSchema, "body")
	],
	queueController.putQueue
);

router.get(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(PaginatedSearchQuerySchema, "query")
	],
	queueController.getMeQueue
);

export default router;
