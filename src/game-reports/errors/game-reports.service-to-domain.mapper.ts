import { DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as gameReportDomainError from "./game-reports.domain-error";

export function gameReportsServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "GAME_REPORT_GAME_NOT_FOUND")
		return gameReportDomainError.gameNotFound(context);

	if (error.code === "GAME_REPORT_ALREADY_REPORTED")
		return gameReportDomainError.alreadyReported(context);

	if (error.code === "GAME_REPORT_NOT_FOUND")
		return gameReportDomainError.notFound(context);

	return gameReportDomainError.internalError(context);
}
