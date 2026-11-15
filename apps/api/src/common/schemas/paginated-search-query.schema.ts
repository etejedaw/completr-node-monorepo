import z from "zod";

import { PaginationQuerySchema } from "./pagination-query.schema";

export const PaginatedSearchQuerySchema = PaginationQuerySchema.unwrap()
	.extend({
		search: z.string().min(1).max(100).optional()
	})
	.readonly();

export type PaginatedSearchQuery = z.infer<typeof PaginatedSearchQuerySchema>;
