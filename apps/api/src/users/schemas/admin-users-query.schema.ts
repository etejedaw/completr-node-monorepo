import z from "zod";

import { PaginationQuerySchema } from "../../common/schemas/pagination-query.schema";

const ADMIN_USERS_QUERY_MAX_LENGTH = 100;

export const AdminUsersQuerySchema = PaginationQuerySchema.unwrap()
	.extend({
		search: z
			.string()
			.trim()
			.max(ADMIN_USERS_QUERY_MAX_LENGTH)
			.transform(value => (value.length > 0 ? value : undefined))
			.optional()
	})
	.readonly();

export type AdminUsersQuery = z.infer<typeof AdminUsersQuerySchema>;
