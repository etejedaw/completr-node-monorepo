import z from "zod";

import { PasswordPolicySchema } from "../../auth/schemas/password-policy.schema";
import { SafeTextSchema } from "../../common/schemas/safe-text.schema";
import { USER_ROLES } from "../user-role.type";

export const AdminUpdateUserSchema = z
	.object({
		name: SafeTextSchema.min(1).max(100).optional(),
		password: PasswordPolicySchema.optional(),
		role: z.enum(USER_ROLES).optional(),
		isActive: z.boolean().optional()
	})
	.strict()
	.readonly();
