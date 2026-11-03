import { Router } from "express";
import { type ZodType } from "zod";

import { authMiddleware } from "../auth/auth.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { exportFormatAccessMiddleware } from "../common/middlewares/export-format-access.middleware";
import { exportFormatNegotiationMiddleware } from "../common/middlewares/export-format-negotiation.middleware";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateBulkBodyMiddleware } from "../common/middlewares/validate-bulk-body.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { PaginatedSearchQuerySchema } from "../common/schemas/paginated-search-query.schema";
import * as queueController from "./queue.controller";
import { AddQueueBodySchema } from "./schemas/add-queue-body.schema";
import { AddQueueQuerySchema } from "./schemas/add-queue-query.schema";
import { BulkQueueSchema } from "./schemas/bulk-queue.schema";
import { MoveQueueEntryBodySchema } from "./schemas/move-queue-entry-body.schema";
import { QueueBacklogIdParamsSchema } from "./schemas/queue-backlog-id-params.schema";
import {
	type QueueBulkQuery,
	QueueBulkQuerySchema
} from "./schemas/queue-bulk-query.schema";
import { QueueExportQuerySchema } from "./schemas/queue-export-query.schema";
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

router.post(
	"/bulk",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(QueueBulkQuerySchema, "query"),
		validateBulkBodyMiddleware({
			add: BulkQueueSchema,
			remove: BulkQueueSchema
		} satisfies Record<QueueBulkQuery["action"], ZodType>)
	],
	queueController.postQueueBulk
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

router.patch(
	"/:backlogId/position",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(QueueBacklogIdParamsSchema, "params"),
		validateSchemaMiddleware(MoveQueueEntryBodySchema, "body")
	],
	queueController.patchQueueEntryPosition
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
		validateSchemaMiddleware(QueueExportQuerySchema, "query"),
		exportFormatNegotiationMiddleware,
		exportFormatAccessMiddleware
	],
	queueController.getMeQueueExport
);

export default router;
