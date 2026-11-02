import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as rewindDomainError from "./rewind.domain-error";

export function rewindServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "REWIND_NOT_FOUND")
		return rewindDomainError.rewindNotFound(context);

	if (error.code === "USER_NOT_FOUND")
		return rewindDomainError.userNotFound(context);

	if (error.code === "USER_PRIVATE")
		return rewindDomainError.userPrivate(context);

	if (error.code === "REWIND_NOT_GENERATED")
		return rewindDomainError.rewindNotGenerated(context);

	if (error.code === "REWIND_GENERATION_CONFLICT")
		return rewindDomainError.rewindGenerationConflict(context);

	if (error.code === "REWIND_REGENERATION_LIMIT")
		return rewindDomainError.rewindRegenerationLimit(context);

	if (error.code === "REWIND_AI_RECAP_PREMIUM_REQUIRED")
		return rewindDomainError.rewindAiRecapPremiumRequired(context);

	if (error.code === "REWIND_AI_RECAP_EXISTS")
		return rewindDomainError.rewindAiRecapExists(context);

	if (error.code === "REWIND_AI_RECAP_IN_PROGRESS")
		return rewindDomainError.rewindAiRecapInProgress(context);

	if (error.code === "REWIND_AI_RECAP_FAILED")
		return rewindDomainError.rewindAiRecapFailed(context);

	return rewindDomainError.rewindInternalError(context);
}
