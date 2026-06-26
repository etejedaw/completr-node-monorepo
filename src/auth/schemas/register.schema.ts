import z from "zod";
import { PasswordPolicySchema } from "./password-policy.schema";

export const RegisterSchema = z
	.object({
		username: z
			.string()
			.min(4)
			.max(15)
			.regex(
				/^[a-z0-9._]+$/,
				"username must contain only lowercase letters, digits, dots or underscores"
			),
		email: z.email().toLowerCase(),
		password: PasswordPolicySchema,
		name: z.string().min(4).max(80),
		bio: z.string().max(250).optional(),
		avatarUrl: z.url().optional()
	})
	.strict()
	.readonly();
