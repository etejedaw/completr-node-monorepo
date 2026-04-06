import { DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as listFollowerDomainError from "./list-followers.domain-error";

export function listFollowersServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "LIST_FOLLOWER_LIST_NOT_FOUND")
		return listFollowerDomainError.listFollowerListNotFound(context);

	if (error.code === "LIST_FOLLOWER_NOT_PUBLIC")
		return listFollowerDomainError.listFollowerNotPublic(context);

	if (error.code === "LIST_FOLLOWER_ALREADY_FOLLOWING")
		return listFollowerDomainError.listFollowerAlreadyFollowing(context);

	if (error.code === "LIST_FOLLOWER_NOT_FOLLOWING")
		return listFollowerDomainError.listFollowerNotFollowing(context);

	return listFollowerDomainError.listFollowerInternalError(context);
}
