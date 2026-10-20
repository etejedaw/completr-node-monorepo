import z from "zod";

import { DisplayNameSchema } from "../../auth/schemas/display-name.schema";
import { PasswordPolicySchema } from "../../auth/schemas/password-policy.schema";
import { UsernameSchema } from "../../auth/schemas/username.schema";
import { OneTimeTokenSchema } from "../../common/schemas/one-time-token.schema";

export const AcceptInvitationSchema = z
	.object({
		token: OneTimeTokenSchema,
		username: UsernameSchema,
		name: DisplayNameSchema,
		password: PasswordPolicySchema
	})
	.strict()
	.readonly();
