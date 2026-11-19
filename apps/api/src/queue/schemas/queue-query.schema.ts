import type z from "zod";

import { PaginatedSearchQuerySchema } from "../../common/schemas/paginated-search-query.schema";
import { MoodTagsFilterSchema } from "../../mood-tags/schemas/mood-tags-filter.schema";

export const QueueQuerySchema = PaginatedSearchQuerySchema.unwrap()
	.extend({ mood_tags: MoodTagsFilterSchema.optional() })
	.readonly();

export type QueueQuery = z.infer<typeof QueueQuerySchema>;
