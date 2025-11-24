import z from "zod";

export const UpdateUserSchema = z
	.object({
		name: z.string().min(1).max(80).optional(),
		bio: z.string().min(1).max(250).optional(),
		avatarUrl: z.string().optional(),
		isPublic: z.boolean().optional()
	})
	.strict()
	.readonly();

export type UpdateUser = z.infer<typeof UpdateUserSchema>;
