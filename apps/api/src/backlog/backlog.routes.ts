import { Router } from "express";
import { type ZodType } from "zod";

import { authMiddleware } from "../auth/auth.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { exportFormatAccessMiddleware } from "../common/middlewares/export-format-access.middleware";
import { exportFormatNegotiationMiddleware } from "../common/middlewares/export-format-negotiation.middleware";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateBulkBodyMiddleware } from "../common/middlewares/validate-bulk-body.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import * as backlogController from "./backlog.controller";
import {
	type BacklogBulkQuery,
	BacklogBulkQuerySchema
} from "./schemas/backlog-bulk-query.schema";
import { BacklogExportQuerySchema } from "./schemas/backlog-export-query.schema";
import { BacklogIdParamsSchema } from "./schemas/backlog-id-params.schema";
import { BacklogQuerySchema } from "./schemas/backlog-query.schema";
import { BulkDeleteBacklogSchema } from "./schemas/bulk-delete-backlog.schema";
import { BulkUpdateBacklogSchema } from "./schemas/bulk-update-backlog.schema";
import { RegisterBacklogSchema } from "./schemas/register-backlog.schema";
import { UpdateBacklogSchema } from "./schemas/update-backlog.schema";

const router = Router({ mergeParams: true });

router.post(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(RegisterBacklogSchema, "body")
	],
	backlogController.postBacklog
);

router.post(
	"/bulk",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(BacklogBulkQuerySchema, "query"),
		validateBulkBodyMiddleware({
			update: BulkUpdateBacklogSchema,
			delete: BulkDeleteBacklogSchema
		} satisfies Record<BacklogBulkQuery["action"], ZodType>)
	],
	backlogController.postBacklogBulk
);

router.get(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(BacklogQuerySchema, "query")
	],
	backlogController.getMeBacklog
);

router.get(
	"/export",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(BacklogExportQuerySchema, "query"),
		exportFormatNegotiationMiddleware,
		exportFormatAccessMiddleware
	],
	backlogController.getMeBacklogExport
);

router.patch(
	"/:backlogId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(BacklogIdParamsSchema, "params"),
		validateSchemaMiddleware(UpdateBacklogSchema, "body")
	],
	backlogController.patchBacklog
);

router.delete(
	"/:backlogId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(BacklogIdParamsSchema, "params")
	],
	backlogController.deleteBacklog
);

export default router;
