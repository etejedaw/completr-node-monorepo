import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { hiddenRouteMiddleware } from "../auth/hidden-route.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
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
		rateLimiterMiddleware(userLimiter),
		authMiddleware(),
		validateSchemaMiddleware(CreateDataRequestSchema, "body")
	],
	dataRequestsController.postDataRequest
);

router.get(
	"/users/me/data-requests",
	[rateLimiterMiddleware(userLimiter), authMiddleware()],
	dataRequestsController.getDataRequests
);

router.get(
	"/users/me/data-requests/:requestId/download",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware(),
		validateSchemaMiddleware(DataRequestIdParamSchema, "params")
	],
	dataRequestsController.getDataRequestDownload
);

router.get(
	"/admin/data-requests",
	[
		rateLimiterMiddleware(userLimiter),
		hiddenRouteMiddleware(),
		validateSchemaMiddleware(AdminDataRequestsQuerySchema, "query")
	],
	dataRequestsAdminController.getAdminDataRequests
);

router.post(
	"/admin/data-requests/:requestId/complete",
	[
		rateLimiterMiddleware(userLimiter),
		hiddenRouteMiddleware(),
		validateSchemaMiddleware(DataRequestIdParamSchema, "params")
	],
	dataRequestsAdminController.postCompleteDataRequest
);

router.post(
	"/admin/data-requests/:requestId/reject",
	[
		rateLimiterMiddleware(userLimiter),
		hiddenRouteMiddleware(),
		validateSchemaMiddleware(DataRequestIdParamSchema, "params"),
		validateSchemaMiddleware(RejectDataRequestSchema, "body")
	],
	dataRequestsAdminController.postRejectDataRequest
);

export default router;
