import { failedPasswordRules, PASSWORD_RULES } from "./password-policy";

function failedIds(password: string) {
	return failedPasswordRules(password).map(rule => rule.id);
}

describe("password policy", () => {
	it("defines the five rules in order", () => {
		expect(PASSWORD_RULES.map(rule => rule.id)).toEqual([
			"length",
			"lowercase",
			"uppercase",
			"number",
			"symbol"
		]);
	});

	it("passes a password that meets every rule", () => {
		expect(failedIds("Abcdef1!")).toEqual([]);
	});

	it("fails every rule for an empty password", () => {
		expect(failedIds("")).toEqual([
			"length",
			"lowercase",
			"uppercase",
			"number",
			"symbol"
		]);
	});

	it("rejects passwords shorter than 8 characters", () => {
		expect(failedIds("Abcde1!")).toEqual(["length"]);
	});

	it("rejects passwords longer than 15 characters", () => {
		expect(failedIds("Abcdefghijklm1!x")).toEqual(["length"]);
	});

	it("accepts the boundary lengths 8 and 15", () => {
		expect(failedIds("Abcdef1!")).toEqual([]);
		expect(failedIds("Abcdefghijklm1!")).toEqual([]);
	});

	it("reports each missing character class", () => {
		expect(failedIds("ABCDEFG1!")).toEqual(["lowercase"]);
		expect(failedIds("abcdefg1!")).toEqual(["uppercase"]);
		expect(failedIds("Abcdefgh!")).toEqual(["number"]);
		expect(failedIds("Abcdefg12")).toEqual(["symbol"]);
	});
});
