import { Router } from "express";
import * as auditController from "./audit.controller";
import { authMiddleware } from "../auth/auth.middleware";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { PaginationQuerySchema } from "../common/schemas/pagination-query.schema";

const router = Router();

router.get(
	"/admin/audit",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("admin"),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	auditController.getAuditLog
);

export default router;
