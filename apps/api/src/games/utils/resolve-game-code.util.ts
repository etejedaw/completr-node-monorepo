import { titleToSlug } from "../../common/utils/title-to-slug.util";
import * as gamesServiceError from "../errors/games.service-error";

export function resolveGameCode(title: string) {
	const code = titleToSlug(title);
	if (!code)
		throw gamesServiceError.validationError(
			new Error("Title must contain at least one slug-safe character")
		);
	return code;
}
