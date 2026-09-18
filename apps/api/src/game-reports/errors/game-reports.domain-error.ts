import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "GameReport Module";

export function gameNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_REPORT_GAME_NOT_FOUND",
		"Game not found",
		context
	);
}

export function alreadyReported(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_REPORT_ALREADY_REPORTED",
		"You already have an active report for this game",
		context
	);
}

export function notFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_REPORT_NOT_FOUND",
		"Report not found",
		context
	);
}

export function internalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_REPORT_INTERNAL_ERROR",
		"Unexpected GameReport Service error",
		context
	);
}
