import z from "zod";

export const UsernameSchema = z
	.string()
	.min(4)
	.max(15)
	.regex(
		/^[a-z0-9._]+$/,
		"username must contain only lowercase letters, digits, dots or underscores"
	);
