import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "MoodTags Service" };

export function gameNotFoundError() {
	return new ServiceError("MOOD_TAGS_GAME_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function tooManyTagsError(max: number) {
	return new ServiceError("MOOD_TAGS_TOO_MANY", {
		...BASE_OPTIONS,
		raw: { max }
	});
}

export function tagNotFoundError() {
	return new ServiceError("MOOD_TAGS_TAG_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function invalidTagError(reason: string) {
	return new ServiceError("MOOD_TAGS_INVALID_TAG", {
		...BASE_OPTIONS,
		raw: { reason }
	});
}
