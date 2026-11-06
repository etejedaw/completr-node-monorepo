import z from "zod";

export const ADMIN_USERS_QUERY_MAX_LENGTH = 100;

export const AdminUsersQuerySchema = z
	.object({
		limit: z.coerce.number().int().min(1).max(100).optional(),
		offset: z.coerce.number().int().min(0).optional(),
		search: z
			.string()
			.trim()
			.max(ADMIN_USERS_QUERY_MAX_LENGTH)
			.transform(value => (value.length > 0 ? value : undefined))
			.optional()
	})
	.readonly();

export type AdminUsersQuery = z.infer<typeof AdminUsersQuerySchema>;
