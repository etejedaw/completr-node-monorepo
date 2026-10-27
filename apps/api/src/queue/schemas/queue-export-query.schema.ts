import z from "zod";

import { PaginatedSearchQuerySchema } from "../../common/schemas/paginated-search-query.schema";

export const QUEUE_EXPORT_SORTS = [
	"manual",
	"ratio",
	"score",
	"duration"
] as const;

export const QueueExportQuerySchema = PaginatedSearchQuerySchema.unwrap()
	.pick({ search: true })
	.extend({ sort: z.enum(QUEUE_EXPORT_SORTS).default("manual") })
	.readonly();

export type QueueExportQuery = z.infer<typeof QueueExportQuerySchema>;
