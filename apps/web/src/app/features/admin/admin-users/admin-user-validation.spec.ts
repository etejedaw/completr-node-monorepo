import {
	blankTextError,
	editedSince,
	errorsStillMatching,
	passwordCompositionError,
	safeTextError,
	serverErrorOutsideFields
} from "./admin-user-validation";

describe("admin user validation", () => {
	describe("passwordCompositionError", () => {
		it("accepts an empty value so the field can stay optional", () => {
			expect(passwordCompositionError("")).toBeNull();
		});

		it.each([
			[
				"ABCDEF1!",
				"Password must contain at least one lowercase letter."
			],
			[
				"abcdef1!",
				"Password must contain at least one uppercase letter."
			],
			["Abcdefg!", "Password must contain at least one number."],
			[
				"Abcdefg1",
				"Password must contain at least one special character."
			]
		])("reports the first missing rule of %s", (value, message) => {
			expect(passwordCompositionError(value)?.message).toBe(message);
		});

		it("accepts a password that meets every composition rule", () => {
			expect(passwordCompositionError("Abcdef1!")).toBeNull();
		});
	});

	it("flags angle brackets in names", () => {
		expect(safeTextError("<script>")).not.toBeNull();
		expect(safeTextError("Ada")).toBeNull();
		expect(safeTextError("")).toBeNull();
	});

	it("flags names made only of spaces", () => {
		expect(blankTextError("   ")?.kind).toBe("blankText");
		expect(blankTextError("Ada")).toBeNull();
		expect(blankTextError("")).toBeNull();
	});

	it("hides a server error once the value that caused it changes", () => {
		const snapshot = { name: "Ada" };

		expect(
			errorsStillMatching({ name: "Taken" }, snapshot, { name: "Ada" })
		).toEqual({ name: "Taken" });
		expect(
			errorsStillMatching({ name: "Taken" }, snapshot, { name: "Grace" })
		).toEqual({});
		expect(editedSince(snapshot, { name: "Grace" })).toBe(true);
		expect(editedSince(null, { name: "Grace" })).toBe(false);
	});

	it("falls back to the response title and then to the default message", () => {
		const response = { error: { title: "Invalid" } };

		expect(serverErrorOutsideFields(response, ["name"], "Failed")).toBe(
			"Invalid"
		);
		expect(
			serverErrorOutsideFields({ error: null }, ["name"], "Failed")
		).toBe("Failed");
	});
});
