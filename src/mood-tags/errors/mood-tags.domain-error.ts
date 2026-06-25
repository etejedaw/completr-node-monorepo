import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "MoodTags Module";

export function gameNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"MOOD_TAGS_GAME_NOT_FOUND",
		"Game not found",
		context
	);
}

export function tooManyTags(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"MOOD_TAGS_TOO_MANY",
		"Too many mood tags for a single game",
		context
	);
}

export function tagNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"MOOD_TAGS_TAG_NOT_FOUND",
		"Mood tag not found for this user",
		context
	);
}

export function invalidTag(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"MOOD_TAGS_INVALID_TAG",
		"Invalid mood tag value",
		context
	);
}

export function moodTagsInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"MOOD_TAGS_INTERNAL_ERROR",
		"Unexpected MoodTags Service error",
		context
	);
}
