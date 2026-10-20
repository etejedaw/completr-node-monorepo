import z from "zod";

import { PasswordPolicySchema } from "./password-policy.schema";

export const ResetPasswordSchema = z
	.object({
		token: z.string().regex(/^[a-f0-9]{64}$/, "Invalid reset token"),
		password: PasswordPolicySchema
	})
	.strict()
	.readonly();
