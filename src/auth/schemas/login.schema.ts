import z from "zod";
import { PasswordPolicySchema } from "./password-policy.schema";

export const LoginSchema = z
	.object({
		email: z.email(),
		password: PasswordPolicySchema
	})
	.strict()
	.readonly();
