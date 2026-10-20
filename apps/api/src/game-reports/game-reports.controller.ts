import { type Request, type Response } from "express";

import * as auditService from "../audit/audit.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type GameIdParam } from "../games/schemas/game-id-params.schema";
import { type CreateReportDto } from "./dtos/create-report.dto";
import { type UpdateReportStatusDto } from "./dtos/update-report-status.dto";
import * as gameReportsService from "./game-reports.service";
import { type ReportIdParams } from "./schemas/report-id-params.schema";

export async function postReport(request: Request, response: Response) {
	const { id: gameId } = request.locals.params as GameIdParam;
	const { message, category } = request.locals.body as CreateReportDto;
	const user = request.locals.user as RequestUser;

	const report = await gameReportsService.createReport(
		gameId,
		user.id,
		message,
		category
	);

	return response.status(201).json({ data: { report } });
}

export async function getPendingReports(_request: Request, response: Response) {
	const reports = await gameReportsService.findPendingReports();

	return response.status(200).json({ data: { reports } });
}

export async function patchReportStatus(request: Request, response: Response) {
	const { reportId } = request.locals.params as ReportIdParams;
	const { status } = request.locals.body as UpdateReportStatusDto;
	const user = request.locals.user as RequestUser;

	const report = await gameReportsService.updateReportStatus(
		reportId,
		status
	);

	auditService.record(user.id, `report_${status}`, "report", reportId);

	return response.status(200).json({ data: { report } });
}
