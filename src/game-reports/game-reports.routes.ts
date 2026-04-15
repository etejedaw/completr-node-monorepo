import { Router } from "express";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { GameIdParamSchema } from "../games/schemas/game-id-params.schema";
import { CreateReportSchema } from "./schemas/create-report.schema";
import { ReportIdParamsSchema } from "./schemas/report-id-params.schema";
import { UpdateReportStatusSchema } from "./schemas/update-report-status.schema";
import * as gameReportsController from "./game-reports.controller";
import { authMiddleware } from "../auth/auth.middleware";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";

const router = Router();

router.post(
	"/games/:id/reports",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware(),
		validateSchemaMiddleware(GameIdParamSchema, "params"),
		validateSchemaMiddleware(CreateReportSchema, "body")
	],
	gameReportsController.postReport
);

router.get(
	"/admin/game-reports",
	[rateLimiterMiddleware(userLimiter), authMiddleware("admin")],
	gameReportsController.getPendingReports
);

router.patch(
	"/admin/game-reports/:reportId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("admin"),
		validateSchemaMiddleware(ReportIdParamsSchema, "params"),
		validateSchemaMiddleware(UpdateReportStatusSchema, "body")
	],
	gameReportsController.patchReportStatus
);

export default router;
