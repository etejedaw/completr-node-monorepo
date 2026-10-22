import { type HttpErrorResponse } from "@angular/common/http";

import {
	fieldErrorsFromResponse,
	validationSummary
} from "../../shared/utils/validation-errors";

const SCORE_PATH = /^scores?(\.|$)/;
const DURATION_PATH = /^(times|duration)(\.|$)/;

const ADMIN_ERROR_MESSAGES: Record<string, string> = {
	GAME_SCORE_OUT_OF_RANGE:
		"A score is above the maximum of its source. Scores go from 0 up to the scale of the source.",
	GAME_IN_USE:
		"This game can't be deleted because users have data on it (backlog, lists, reviews, etc.) or it has variants or DLC. Deactivate it instead to hide it without losing data.",
	GAME_NOT_FOUND:
		"This game no longer exists or is already inactive. Refresh the page to see its current state.",
	GAME_UNIQUE_CONSTRAINT:
		"Another game already uses this title or code. Choose a different title.",
	GAME_VARIANT_REQUIRED:
		"Another game shares this external id. Set a variant label on both games.",
	GENRE_UNIQUE_CONSTRAINT: "A genre with this name already exists.",
	GENRE_VALIDATION_ERROR:
		"The genre name needs letters or numbers so a valid slug can be generated.",
	GENRE_NOT_FOUND:
		"This genre no longer exists. Refresh the list and try again.",
	GENRE_IN_USE:
		"This genre is assigned to at least one game. Remove it from those games before deleting it.",
	PLATFORM_UNIQUE_CONSTRAINT: "A platform with this name already exists.",
	PLATFORM_NOT_FOUND:
		"This platform no longer exists. Refresh the list and try again.",
	PLATFORM_IN_USE:
		"This platform is used by games, shelves, backlogs or wishlist entries. Remove those references before deleting it."
};

interface ScoreOutOfRangeBody {
	context?: { raw?: { source?: unknown; scale?: unknown } };
}

function scoreOutOfRangeMessage(body: ScoreOutOfRangeBody): string {
	const raw = body.context?.raw;
	if (typeof raw?.source === "string" && typeof raw.scale === "number")
		return `The ${raw.source} score must be between 0 and ${raw.scale}.`;
	return ADMIN_ERROR_MESSAGES["GAME_SCORE_OUT_OF_RANGE"];
}

function schemaInvalidMessage(error: unknown): string | null {
	const paths = Object.keys(fieldErrorsFromResponse(error));
	const messages: string[] = [];
	if (paths.some(path => SCORE_PATH.test(path)))
		messages.push("Scores can't be negative.");
	if (paths.some(path => DURATION_PATH.test(path)))
		messages.push("Durations must be greater than 0.");
	return messages.length > 0 ? messages.join(" ") : validationSummary(error);
}

export function adminErrorMessage(error: unknown): string | null {
	const body = (error as HttpErrorResponse | undefined)?.error;
	const type = body?.type;
	if (typeof type !== "string") return null;
	if (type === "GAME_SCORE_OUT_OF_RANGE") return scoreOutOfRangeMessage(body);
	if (type === "COMMON_SCHEMA_INVALID") return schemaInvalidMessage(error);
	return Object.hasOwn(ADMIN_ERROR_MESSAGES, type)
		? ADMIN_ERROR_MESSAGES[type]
		: null;
}
