import z from "zod";
import { PasswordPolicySchema } from "./password-policy.schema";

export const RegisterSchema = z
	.object({
		username: z.string().min(4).max(15).toLowerCase(),
		email: z.email().toLowerCase(),
		password: PasswordPolicySchema,
		name: z.string().min(4).max(80),
		bio: z.string().max(250).optional(),
		avatarUrl: z.url().optional()
	})
	.strict()
	.readonly();
