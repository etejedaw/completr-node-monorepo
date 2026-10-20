import z from "zod";

import { SafeTextSchema } from "../../common/schemas/safe-text.schema";
import { DisplayNameSchema } from "./display-name.schema";
import { PasswordPolicySchema } from "./password-policy.schema";
import { UsernameSchema } from "./username.schema";

export const RegisterSchema = z
	.object({
		username: UsernameSchema,
		email: z.email().toLowerCase(),
		password: PasswordPolicySchema,
		name: DisplayNameSchema,
		bio: SafeTextSchema.max(250).optional(),
		avatarUrl: z.url().optional()
	})
	.strict()
	.readonly();
