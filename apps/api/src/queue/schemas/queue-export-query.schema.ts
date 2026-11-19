import z from "zod";

import { PaginatedSearchQuerySchema } from "../../common/schemas/paginated-search-query.schema";
import { MoodTagsFilterSchema } from "../../mood-tags/schemas/mood-tags-filter.schema";

export const QUEUE_EXPORT_SORTS = [
	"manual",
	"ratio",
	"score",
	"duration"
] as const;

export const QueueExportQuerySchema = PaginatedSearchQuerySchema.unwrap()
	.pick({ search: true })
	.extend({
		sort: z.enum(QUEUE_EXPORT_SORTS).default("manual"),
		mood_tags: MoodTagsFilterSchema.optional()
	})
	.readonly();

export type QueueExportQuery = z.infer<typeof QueueExportQuerySchema>;
