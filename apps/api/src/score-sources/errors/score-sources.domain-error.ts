import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "ScoreSource Module";

export function scoreSourceAlreadyExists(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"SCORE_SOURCE_ALREADY_EXISTS",
		"A score source with this code already exists",
		context
	);
}

export function scoreSourceInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"SCORE_SOURCE_INTERNAL_ERROR",
		"Unexpected ScoreSource Service error",
		context
	);
}
