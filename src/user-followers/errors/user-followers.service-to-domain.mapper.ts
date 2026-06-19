import { DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as domainError from "./user-followers.domain-error";

export function userFollowersServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "USER_FOLLOWER_USER_NOT_FOUND")
		return domainError.userNotFound(context);

	if (error.code === "USER_FOLLOWER_NOT_FOLLOWING")
		return domainError.notFollowing(context);

	return domainError.internalError(context);
}
