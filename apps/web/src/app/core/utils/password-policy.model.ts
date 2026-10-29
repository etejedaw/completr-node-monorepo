export interface PasswordRule {
	id: string;
	label: string;
	test: (password: string) => boolean;
}
