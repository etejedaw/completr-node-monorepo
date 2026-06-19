import { DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as domainError from "./user-follow-requests.domain-error";

export function userFollowRequestsServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "USER_FOLLOW_REQUEST_USER_NOT_FOUND")
		return domainError.userNotFound(context);

	if (error.code === "USER_FOLLOW_REQUEST_CANNOT_REQUEST_SELF")
		return domainError.cannotRequestSelf(context);

	if (error.code === "USER_FOLLOW_REQUEST_ALREADY_REQUESTED")
		return domainError.alreadyRequested(context);

	if (error.code === "USER_FOLLOW_REQUEST_ALREADY_FOLLOWING")
		return domainError.alreadyFollowing(context);

	if (error.code === "USER_FOLLOW_REQUEST_NOT_FOUND")
		return domainError.notFound(context);

	if (error.code === "USER_FOLLOW_REQUEST_NOT_ACCEPTING")
		return domainError.notAcceptingRequests(context);

	return domainError.internalError(context);
}
