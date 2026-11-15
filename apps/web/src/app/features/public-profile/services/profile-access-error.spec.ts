import {
	errorStatusOf,
	hasLoadFailedOf,
	profileAccessErrorOf
} from "./profile-access-error";

describe("profile access errors", () => {
	it("treats 403 as private and 404 as not found", () => {
		expect(profileAccessErrorOf({ status: 403 })).toBe("private");
		expect(profileAccessErrorOf({ status: 404 })).toBe("not_found");
	});

	it("does not flag a load failure for access errors", () => {
		expect(hasLoadFailedOf({ status: 403 })).toBe(false);
		expect(hasLoadFailedOf({ status: 404 })).toBe(false);
	});

	it("flags server, network and garbage errors as load failures", () => {
		expect(hasLoadFailedOf({ status: 500 })).toBe(true);
		expect(hasLoadFailedOf({ status: 0 })).toBe(true);
		expect(hasLoadFailedOf(new Error("boom"))).toBe(true);
		expect(hasLoadFailedOf("garbage")).toBe(true);
	});

	it("reads the status of an error wrapped by a resource", () => {
		const wrapped = new Error("wrapped", { cause: { status: 403 } });

		expect(profileAccessErrorOf(wrapped)).toBe("private");
		expect(errorStatusOf(wrapped)).toBe(403);
	});

	it("reports no status and no failure when there is no error", () => {
		expect(errorStatusOf(undefined)).toBeNull();
		expect(errorStatusOf(null)).toBeNull();
		expect(profileAccessErrorOf(undefined)).toBeNull();
		expect(hasLoadFailedOf(undefined)).toBe(false);
	});
});
