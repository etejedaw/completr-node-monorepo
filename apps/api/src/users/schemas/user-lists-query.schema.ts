import z from "zod";

export const UserListsQuerySchema = z
	.object({
		limit: z.coerce.number().int().min(1).max(100).optional(),
		offset: z.coerce.number().int().min(0).optional(),
		search: z.string().min(1).max(100).optional()
	})
	.strict()
	.readonly();

export type UserListsQuery = z.infer<typeof UserListsQuerySchema>;
