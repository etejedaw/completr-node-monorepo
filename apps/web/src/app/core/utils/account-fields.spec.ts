import {
	NAME_LENGTH_MESSAGE,
	USERNAME_LENGTH_MESSAGE,
	USERNAME_PATTERN
} from "./account-fields";

describe("account fields", () => {
	it.each(["abcd", "user.name_1", "a1._"])(
		"accepts username %s",
		username => {
			expect(USERNAME_PATTERN.test(username)).toBe(true);
		}
	);

	it.each(["Abcd", "user name", "user-name", "usér", ""])(
		"rejects username %j",
		username => {
			expect(USERNAME_PATTERN.test(username)).toBe(false);
		}
	);

	it("builds the length messages from the limits", () => {
		expect(USERNAME_LENGTH_MESSAGE).toBe(
			"Username must be between 4 and 15 characters."
		);
		expect(NAME_LENGTH_MESSAGE).toBe(
			"Name must be between 4 and 80 characters."
		);
	});
});
