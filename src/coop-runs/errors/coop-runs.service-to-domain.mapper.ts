import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as coopDomainError from "./coop-runs.domain-error";

export function coopRunsServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;
	const context = { ...error.serviceError, correlationId };

	if (error.code === "COOP_BACKLOG_NOT_FOUND")
		return coopDomainError.backlogNotFound(context);
	if (error.code === "COOP_FORBIDDEN")
		return coopDomainError.forbidden(context);
	if (error.code === "COOP_TARGET_USER_NOT_FOUND")
		return coopDomainError.targetUserNotFound(context);
	if (error.code === "COOP_TARGET_NOT_FOLLOWED")
		return coopDomainError.notFollowing(context);
	if (error.code === "COOP_SELF_TAG") return coopDomainError.selfTag(context);
	if (error.code === "COOP_ALREADY_TAGGED")
		return coopDomainError.alreadyTagged(context);
	if (error.code === "COOP_MEMBER_NOT_FOUND")
		return coopDomainError.memberNotFound(context);
	if (error.code === "COOP_SOURCE_NOT_IN_RUN")
		return coopDomainError.sourceBacklogNotInRun(context);

	return coopDomainError.coopRunsInternalError(context);
}
