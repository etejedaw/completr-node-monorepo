import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { hiddenRouteMiddleware } from "../auth/hidden-route.middleware";
import {
	dataExportLimiter,
	userLimiter
} from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import * as dataRequestsController from "./data-requests.controller";
import * as dataRequestsAdminController from "./data-requests-admin.controller";
import { AdminDataRequestsQuerySchema } from "./schemas/admin-data-requests-query.schema";
import { CreateDataRequestSchema } from "./schemas/create-data-request.schema";
import { DataRequestIdParamSchema } from "./schemas/data-request-id-params.schema";
import { RejectDataRequestSchema } from "./schemas/reject-data-request.schema";

const router = Router();

router.post(
	"/users/me/data-requests",
	[
		authMiddleware(),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(CreateDataRequestSchema, "body")
	],
	dataRequestsController.postDataRequest
);

router.get(
	"/users/me/data-requests",
	[authMiddleware(), rateLimiterMiddleware(userLimiter)],
	dataRequestsController.getDataRequests
);

router.get(
	"/users/me/data-requests/:requestId/download",
	[
		authMiddleware(),
		rateLimiterMiddleware(dataExportLimiter),
		validateSchemaMiddleware(DataRequestIdParamSchema, "params")
	],
	dataRequestsController.getDataRequestDownload
);

router.get(
	"/admin/data-requests",
	[
		hiddenRouteMiddleware(),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(AdminDataRequestsQuerySchema, "query")
	],
	dataRequestsAdminController.getAdminDataRequests
);

router.post(
	"/admin/data-requests/:requestId/complete",
	[
		hiddenRouteMiddleware(),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(DataRequestIdParamSchema, "params")
	],
	dataRequestsAdminController.postCompleteDataRequest
);

router.post(
	"/admin/data-requests/:requestId/reject",
	[
		hiddenRouteMiddleware(),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(DataRequestIdParamSchema, "params"),
		validateSchemaMiddleware(RejectDataRequestSchema, "body")
	],
	dataRequestsAdminController.postRejectDataRequest
);

export default router;
