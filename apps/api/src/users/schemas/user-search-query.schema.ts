import z from "zod";

export const UserSearchQuerySchema = z
	.object({
		search: z.string().min(1).optional(),
		email: z.email().optional(),
		limit: z.coerce.number().int().min(1).max(50).optional()
	})
	.strict()
	.refine(v => v.search !== undefined || v.email !== undefined, {
		message: "search or email is required"
	})
	.readonly();

export type UserSearchQuery = z.infer<typeof UserSearchQuerySchema>;
