import type z from "zod";

import { PaginatedSearchQuerySchema } from "../../common/schemas/paginated-search-query.schema";
import { MoodTagsFilterSchema } from "../../mood-tags/schemas/mood-tags-filter.schema";

export const PlatinumsQuerySchema = PaginatedSearchQuerySchema.unwrap()
	.extend({ mood_tags: MoodTagsFilterSchema.optional() })
	.readonly();

export type PlatinumsQuery = z.infer<typeof PlatinumsQuerySchema>;
