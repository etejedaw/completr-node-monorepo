import { HttpErrorResponse } from "@angular/common/http";

import { problemType } from "./problem-details";

describe("problemType", () => {
	it("reads the type of a problem details body", () => {
		const error = new HttpErrorResponse({
			status: 404,
			error: { type: "BACKLOG_NOT_FOUND" }
		});

		expect(problemType(error)).toBe("BACKLOG_NOT_FOUND");
	});

	it.each([null, undefined, "", "plain text", 42, { type: 7 }, {}])(
		"returns null for a body that is %j",
		body => {
			const error = new HttpErrorResponse({ status: 500, error: body });

			expect(problemType(error)).toBeNull();
		}
	);

	it("returns null when the error is not an http error", () => {
		expect(problemType(undefined)).toBeNull();
		expect(problemType(new Error("boom"))).toBeNull();
	});
});
