import {
	fieldErrorsFromResponse,
	validationSummary
} from "./validation-errors";

function schemaError(issues: unknown) {
	return { error: { type: "COMMON_SCHEMA_INVALID", issues } };
}

describe("validation error helpers", () => {
	describe("fieldErrorsFromResponse", () => {
		it("maps each issue path to its message", () => {
			const result = fieldErrorsFromResponse(
				schemaError([
					{ path: "email", code: "invalid", message: "Bad email" },
					{ path: "name", code: "short", message: "Too short" }
				])
			);

			expect(result).toEqual({ email: "Bad email", name: "Too short" });
		});

		it("keeps the first message when a path has several issues", () => {
			const result = fieldErrorsFromResponse(
				schemaError([
					{ path: "password", code: "a", message: "First" },
					{ path: "password", code: "b", message: "Second" }
				])
			);

			expect(result).toEqual({ password: "First" });
		});

		it("stores issues without a path under the underscore key", () => {
			const result = fieldErrorsFromResponse(
				schemaError([{ path: "", code: "x", message: "Form level" }])
			);

			expect(result).toEqual({ _: "Form level" });
		});

		it.each([
			["undefined", undefined],
			["a non-http error", new Error("boom")],
			["another error type", { error: { type: "OTHER", issues: [] } }],
			["non-array issues", schemaError("nope")]
		])("returns an empty map for %s", (_label, error) => {
			expect(fieldErrorsFromResponse(error)).toEqual({});
		});
	});

	describe("validationSummary", () => {
		it("joins the issue messages with a middle dot", () => {
			const summary = validationSummary(
				schemaError([
					{ path: "a", code: "x", message: "A is required" },
					{ path: "b", code: "y", message: "B is invalid" }
				])
			);

			expect(summary).toBe("A is required · B is invalid");
		});

		it("returns null when there are no issues", () => {
			expect(validationSummary(schemaError([]))).toBeNull();
			expect(validationSummary(undefined)).toBeNull();
			expect(validationSummary({ error: { type: "OTHER" } })).toBeNull();
		});
	});
});
