import z from "zod";

import { SafeTextSchema } from "../../common/schemas/safe-text.schema";

const ROLES = ["user", "premium", "moderator", "admin"] as const;

export const AdminUpdateUserSchema = z
	.object({
		name: SafeTextSchema.min(1).max(100).optional(),
		password: z.string().min(8).max(128).optional(),
		role: z.enum(ROLES).optional(),
		isActive: z.boolean().optional()
	})
	.readonly();

export type AdminUpdateUserDto = z.infer<typeof AdminUpdateUserSchema>;
