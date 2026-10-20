import z from "zod";

import { OneTimeTokenSchema } from "../../common/schemas/one-time-token.schema";
import { PasswordPolicySchema } from "./password-policy.schema";

export const ResetPasswordSchema = z
	.object({
		token: OneTimeTokenSchema,
		password: PasswordPolicySchema
	})
	.strict()
	.readonly();
