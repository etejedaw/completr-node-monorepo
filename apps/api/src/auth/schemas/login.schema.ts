import z from "zod";

const LOGIN_PASSWORD_MAX_LENGTH = 128;

export const LoginSchema = z
	.object({
		email: z.email().toLowerCase(),
		password: z.string().min(1).max(LOGIN_PASSWORD_MAX_LENGTH)
	})
	.strict()
	.readonly();
