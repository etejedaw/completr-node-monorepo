import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { hiddenRouteMiddleware } from "../auth/hidden-route.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { GameIdParamSchema } from "../games/schemas/game-id-params.schema";
import * as gameReportsController from "./game-reports.controller";
import { CreateReportSchema } from "./schemas/create-report.schema";
import { ReportIdParamsSchema } from "./schemas/report-id-params.schema";
import { UpdateReportStatusSchema } from "./schemas/update-report-status.schema";

const router = Router();

router.post(
	"/games/:id/reports",
	[
		authMiddleware(),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(GameIdParamSchema, "params"),
		validateSchemaMiddleware(CreateReportSchema, "body")
	],
	gameReportsController.postReport
);

router.get(
	"/admin/game-reports",
	[hiddenRouteMiddleware("moderator"), rateLimiterMiddleware(userLimiter)],
	gameReportsController.getPendingReports
);

router.patch(
	"/admin/game-reports/:reportId",
	[
		hiddenRouteMiddleware("moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(ReportIdParamsSchema, "params"),
		validateSchemaMiddleware(UpdateReportStatusSchema, "body")
	],
	gameReportsController.patchReportStatus
);

export default router;
