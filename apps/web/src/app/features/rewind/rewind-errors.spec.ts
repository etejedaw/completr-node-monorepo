import {
	rewindAiRecapError,
	rewindGenerateError,
	rewindLoadError
} from "./rewind-errors";

function failure(status: number, type?: string) {
	return { status, error: type ? { type } : null };
}

describe("rewindLoadError", () => {
	it("tells a missing player from a missing Rewind", () => {
		expect(rewindLoadError(failure(404, "USER_NOT_FOUND"))).toBe(
			"user_not_found"
		);
		expect(rewindLoadError(failure(404, "REWIND_NOT_FOUND"))).toBe(
			"not_found"
		);
		expect(rewindLoadError(failure(404))).toBe("not_found");
	});

	it("maps a private profile and any other status", () => {
		expect(rewindLoadError(failure(403, "USER_PRIVATE"))).toBe("private");
		expect(rewindLoadError(failure(500))).toBe("failed");
		expect(rewindLoadError(failure(0))).toBe("failed");
	});

	it("reports nothing without an error and survives garbage", () => {
		expect(rewindLoadError(undefined)).toBeNull();
		expect(rewindLoadError(null)).toBeNull();
		expect(rewindLoadError("boom")).toBe("failed");
		expect(rewindLoadError({ status: "404" })).toBe("failed");
	});
});

describe("rewindGenerateError", () => {
	it.each([
		[0, undefined, "network"],
		[409, "REWIND_REGENERATION_LIMIT", "limit"],
		[409, "REWIND_PERIOD_CLOSED", "period_closed"],
		[409, "SOMETHING_ELSE", "conflict"],
		[409, undefined, "conflict"],
		[403, "REWIND_YEAR_REQUIRES_PREMIUM", "year_requires_premium"],
		[403, "USER_PRIVATE", "failed"],
		[402, undefined, "premium_required"],
		[404, undefined, "not_found"],
		[422, undefined, "invalid"],
		[429, undefined, "rate_limited"],
		[500, undefined, "failed"],
		[503, "COMMON_SOURCE_UNAVAILABLE", "failed"]
	] as const)("maps %s %s to %s", (status, type, expected) => {
		expect(rewindGenerateError(failure(status, type))).toBe(expected);
	});

	it("falls back to failed for input that is not an HTTP error", () => {
		expect(rewindGenerateError(undefined)).toBe("failed");
		expect(rewindGenerateError(null)).toBe("failed");
		expect(rewindGenerateError("boom")).toBe("failed");
		expect(rewindGenerateError({ status: 409, error: "text" })).toBe(
			"conflict"
		);
	});
});

describe("rewindAiRecapError", () => {
	it.each([
		[0, undefined, "network"],
		[402, undefined, "premium_required"],
		[403, "REWIND_YEAR_REQUIRES_PREMIUM", "year_requires_premium"],
		[409, "REWIND_AI_RECAP_IN_PROGRESS", "in_progress"],
		[409, "REWIND_PERIOD_CLOSED", "period_closed"],
		[409, "REWIND_REGENERATION_LIMIT", "limit"],
		[409, "REWIND_AI_RECAP_EXISTS", "exists"],
		[404, undefined, "not_generated"],
		[429, undefined, "rate_limited"],
		[500, undefined, "failed"]
	] as const)("maps %s %s to %s", (status, type, expected) => {
		expect(rewindAiRecapError(failure(status, type))).toBe(expected);
	});

	it("falls back to failed for input that is not an HTTP error", () => {
		expect(rewindAiRecapError(undefined)).toBe("failed");
		expect(rewindAiRecapError("boom")).toBe("failed");
	});
});
