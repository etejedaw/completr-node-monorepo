import { Router } from "express";
import * as auditController from "./audit.controller";
import { hiddenRouteMiddleware } from "../auth/hidden-route.middleware";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { AuditQuerySchema } from "./audit-query.schema";

const router = Router();

router.get(
	"/admin/audit",
	[
		rateLimiterMiddleware(userLimiter),
		hiddenRouteMiddleware(),
		validateSchemaMiddleware(AuditQuerySchema, "query")
	],
	auditController.getAuditLog
);

export default router;
