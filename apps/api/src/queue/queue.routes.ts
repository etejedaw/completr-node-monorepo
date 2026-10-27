import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { exportFormatAccessMiddleware } from "../common/middlewares/export-format-access.middleware";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { ExportFormatQuerySchema } from "../common/schemas/export-format-query.schema";
import { PaginatedSearchQuerySchema } from "../common/schemas/paginated-search-query.schema";
import * as queueController from "./queue.controller";
import { AddQueueBodySchema } from "./schemas/add-queue-body.schema";
import { AddQueueQuerySchema } from "./schemas/add-queue-query.schema";
import { ReplaceQueueSchema } from "./schemas/replace-queue.schema";

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
	"/backlog-ids",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator")
	],
	queueController.getMeQueueBacklogIds
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

router.get(
	"/export",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(ExportFormatQuerySchema, "query"),
		exportFormatAccessMiddleware
	],
	queueController.getMeQueueExport
);

export default router;
