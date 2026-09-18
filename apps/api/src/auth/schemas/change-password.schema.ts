import z from "zod";

import { PasswordPolicySchema } from "./password-policy.schema";

export const ChangePasswordSchema = z
	.object({
		password: PasswordPolicySchema
	})
	.strict()
	.readonly();

export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
