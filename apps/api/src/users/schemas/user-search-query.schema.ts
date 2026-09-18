import z from "zod";

export const UserSearchQuerySchema = z
	.object({
		q: z.string().min(1).optional(),
		email: z.email().optional(),
		limit: z.coerce.number().int().min(1).max(50).optional()
	})
	.strict()
	.refine(v => v.q !== undefined || v.email !== undefined, {
		message: "q or email is required"
	})
	.readonly();

export type UserSearchQuery = z.infer<typeof UserSearchQuerySchema>;
