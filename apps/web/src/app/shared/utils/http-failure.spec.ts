import { HttpErrorResponse } from "@angular/common/http";

import { isNotFound, problemTitle, reportHttpFailure } from "./http-failure";

describe("http failure helpers", () => {
	const failure = (status: number) => new HttpErrorResponse({ status });

	it("recognises only a 404 response as not found", () => {
		expect(isNotFound(failure(404))).toBe(true);
		expect(isNotFound(failure(500))).toBe(false);
		expect(isNotFound(new Error("boom"))).toBe(false);
		expect(isNotFound(null)).toBe(false);
	});

	it("toasts a failure the interceptor does not report", () => {
		const toast = { error: vi.fn() };

		reportHttpFailure(toast, failure(500), "Failed");
		reportHttpFailure(toast, failure(0), "Offline");

		expect(toast.error.mock.calls).toEqual([["Failed"], ["Offline"]]);
	});

	it("stays silent for statuses the interceptor reports and for non-http errors", () => {
		const toast = { error: vi.fn() };

		for (const status of [402, 409, 422, 429])
			reportHttpFailure(toast, failure(status), "Failed");
		reportHttpFailure(toast, new Error("limit"), "Failed");

		expect(toast.error).not.toHaveBeenCalled();
	});

	it("reads the title of a Problem Details body and ignores anything else", () => {
		const problem = new HttpErrorResponse({
			status: 404,
			error: { title: "Run not found" }
		});

		expect(problemTitle(problem)).toBe("Run not found");
		expect(problemTitle(new HttpErrorResponse({ status: 500 }))).toBeNull();
		expect(
			problemTitle(
				new HttpErrorResponse({ status: 500, error: "<html>" })
			)
		).toBeNull();
		expect(
			problemTitle(
				new HttpErrorResponse({ status: 500, error: { title: 7 } })
			)
		).toBeNull();
		expect(problemTitle(new Error("boom"))).toBeNull();
	});
});
