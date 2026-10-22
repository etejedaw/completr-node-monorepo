import { HttpErrorResponse } from "@angular/common/http";

import { adminErrorMessage } from "./admin-error-message";

function apiError(status: number, body: object | null) {
	return new HttpErrorResponse({ status, error: body });
}

describe("adminErrorMessage", () => {
	it.each([
		[
			"GAME_IN_USE",
			409,
			"This game can't be deleted because users have data on it (backlog, lists, reviews, etc.) or it has variants or DLC. Deactivate it instead to hide it without losing data."
		],
		[
			"GAME_NOT_FOUND",
			404,
			"This game no longer exists or is already inactive. Refresh the page to see its current state."
		],
		[
			"GAME_UNIQUE_CONSTRAINT",
			409,
			"Another game already uses this title or code. Choose a different title."
		],
		[
			"GAME_VARIANT_REQUIRED",
			422,
			"Another game shares this external id. Set a variant label on both games."
		],
		[
			"GAME_SCORE_OUT_OF_RANGE",
			422,
			"A score is above the maximum of its source. Scores go from 0 up to the scale of the source."
		],
		[
			"GENRE_UNIQUE_CONSTRAINT",
			409,
			"A genre with this name already exists."
		],
		[
			"GENRE_VALIDATION_ERROR",
			400,
			"The genre name needs letters or numbers so a valid slug can be generated."
		],
		[
			"GENRE_NOT_FOUND",
			404,
			"This genre no longer exists. Refresh the list and try again."
		],
		[
			"GENRE_IN_USE",
			409,
			"This genre is assigned to at least one game. Remove it from those games before deleting it."
		],
		[
			"PLATFORM_UNIQUE_CONSTRAINT",
			409,
			"A platform with this name already exists."
		],
		[
			"PLATFORM_NOT_FOUND",
			404,
			"This platform no longer exists. Refresh the list and try again."
		],
		[
			"PLATFORM_IN_USE",
			409,
			"This platform is used by games, shelves, backlogs or wishlist entries. Remove those references before deleting it."
		]
	])("maps %s", (type, status, message) => {
		expect(adminErrorMessage(apiError(status, { type }))).toBe(message);
	});

	it("names the source and its scale when the API reports them", () => {
		const error = apiError(422, {
			type: "GAME_SCORE_OUT_OF_RANGE",
			context: { raw: { source: "metacritic", score: 150, scale: 100 } }
		});

		expect(adminErrorMessage(error)).toBe(
			"The metacritic score must be between 0 and 100."
		);
	});

	it("explains a negative score from the schema issues", () => {
		const error = apiError(422, {
			type: "COMMON_SCHEMA_INVALID",
			issues: [
				{ path: "scores.0.score", code: "too_small", message: "Too small" }
			]
		});

		expect(adminErrorMessage(error)).toBe("Scores can't be negative.");
	});

	it("explains a non positive duration from the schema issues", () => {
		const error = apiError(422, {
			type: "COMMON_SCHEMA_INVALID",
			issues: [
				{ path: "times.1.duration", code: "too_small", message: "Too small" }
			]
		});

		expect(adminErrorMessage(error)).toBe(
			"Durations must be greater than 0."
		);
	});

	it("explains both problems when scores and durations are invalid", () => {
		const error = apiError(422, {
			type: "COMMON_SCHEMA_INVALID",
			issues: [
				{ path: "scores.0.score", code: "too_small", message: "Too small" },
				{ path: "times.0.duration", code: "too_small", message: "Too small" }
			]
		});

		expect(adminErrorMessage(error)).toBe(
			"Scores can't be negative. Durations must be greater than 0."
		);
	});

	it("summarizes the issues of any other invalid field", () => {
		const error = apiError(422, {
			type: "COMMON_SCHEMA_INVALID",
			issues: [{ path: "title", code: "too_small", message: "Title is empty" }]
		});

		expect(adminErrorMessage(error)).toBe("Title is empty");
	});

	it("returns null for unknown codes, plain errors and empty bodies", () => {
		expect(adminErrorMessage(apiError(500, { type: "SOMETHING_ELSE" }))).toBeNull();
		expect(adminErrorMessage(apiError(500, { type: "constructor" }))).toBeNull();
		expect(adminErrorMessage(apiError(0, null))).toBeNull();
		expect(adminErrorMessage(new Error("boom"))).toBeNull();
		expect(adminErrorMessage(undefined)).toBeNull();
	});
});
