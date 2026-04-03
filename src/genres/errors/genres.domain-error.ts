import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Genre Module";

export function genreNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GENRE_NOT_FOUND",
		"Genre not found",
		context
	);
}
