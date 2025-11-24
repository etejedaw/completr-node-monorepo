import z from "zod";

export const PasswordPolicySchema = z
	.string()
	.min(8, "Password must be at least 8 characters long.")
	.max(15, "Password must be less than 20 characters long.")
	.regex(/[a-z]/, "Password must contain at least one lowercase letter.")
	.regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
	.regex(/[0-9]/, "Password must contain at least one number.")
	.regex(
		/[^A-Za-z0-9]/,
		"Password must contain at least one special character."
	);
