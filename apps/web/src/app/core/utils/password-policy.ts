export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 15;

export interface PasswordRule {
	id: string;
	label: string;
	test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
	{
		id: "length",
		label: `${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters`,
		test: password =>
			password.length >= PASSWORD_MIN_LENGTH &&
			password.length <= PASSWORD_MAX_LENGTH
	},
	{
		id: "lowercase",
		label: "A lowercase letter",
		test: password => /[a-z]/.test(password)
	},
	{
		id: "uppercase",
		label: "An uppercase letter",
		test: password => /[A-Z]/.test(password)
	},
	{
		id: "number",
		label: "A number",
		test: password => /[0-9]/.test(password)
	},
	{
		id: "symbol",
		label: "A symbol, like ! or #",
		test: password => /[^A-Za-z0-9]/.test(password)
	}
];

export function failedPasswordRules(password: string): PasswordRule[] {
	return PASSWORD_RULES.filter(rule => !rule.test(password));
}
