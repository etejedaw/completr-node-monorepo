import { DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as moodTagsDomainError from "./mood-tags.domain-error";

export function moodTagsServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "MOOD_TAGS_GAME_NOT_FOUND")
		return moodTagsDomainError.gameNotFound(context);

	if (error.code === "MOOD_TAGS_TOO_MANY")
		return moodTagsDomainError.tooManyTags(context);

	if (error.code === "MOOD_TAGS_TAG_NOT_FOUND")
		return moodTagsDomainError.tagNotFound(context);

	if (error.code === "MOOD_TAGS_INVALID_TAG")
		return moodTagsDomainError.invalidTag(context);

	return moodTagsDomainError.moodTagsInternalError(context);
}
