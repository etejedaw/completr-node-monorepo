import { Router } from "express";

import { hiddenRouteMiddleware } from "../auth/hidden-route.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import * as rewindAdminController from "./rewind-admin.controller";
import {
	AdminRewindParamsSchema,
	AdminRewindsQuerySchema,
	UpdateAdminRewindSchema
} from "./schemas/rewind-admin.schemas";

const router = Router();
const adminMiddleware = [
	rateLimiterMiddleware(userLimiter),
	hiddenRouteMiddleware()
];

router.get(
	"/admin/rewinds",
	[
		...adminMiddleware,
		validateSchemaMiddleware(AdminRewindsQuerySchema, "query")
	],
	rewindAdminController.getAdminRewinds
);
router.patch(
	"/admin/rewinds/:rewindId",
	[
		...adminMiddleware,
		validateSchemaMiddleware(AdminRewindParamsSchema, "params"),
		validateSchemaMiddleware(UpdateAdminRewindSchema, "body")
	],
	rewindAdminController.patchAdminRewind
);

export default router;
