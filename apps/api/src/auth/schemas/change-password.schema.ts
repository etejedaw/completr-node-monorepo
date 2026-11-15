import z from "zod";

import { PasswordPolicySchema } from "./password-policy.schema";

const CURRENT_PASSWORD_MAX_LENGTH = 128;

export const ChangePasswordSchema = z
	.object({
		currentPassword: z.string().min(1).max(CURRENT_PASSWORD_MAX_LENGTH),
		password: PasswordPolicySchema
	})
	.strict()
	.readonly();
