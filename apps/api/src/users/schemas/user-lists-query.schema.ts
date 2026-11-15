import type z from "zod";

import { PaginatedSearchQuerySchema } from "../../common/schemas/paginated-search-query.schema";

export const UserListsQuerySchema = PaginatedSearchQuerySchema.unwrap()
	.strict()
	.readonly();

export type UserListsQuery = z.infer<typeof UserListsQuerySchema>;
