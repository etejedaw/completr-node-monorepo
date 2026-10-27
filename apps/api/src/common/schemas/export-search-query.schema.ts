import type z from "zod";

import { PaginatedSearchQuerySchema } from "./paginated-search-query.schema";

export const ExportSearchQuerySchema = PaginatedSearchQuerySchema.unwrap()
	.pick({ search: true })
	.readonly();

export type ExportSearchQuery = z.infer<typeof ExportSearchQuerySchema>;
