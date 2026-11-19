import type z from "zod";

import { PaginatedSearchQuerySchema } from "../../common/schemas/paginated-search-query.schema";
import { MoodTagsFilterSchema } from "../../mood-tags/schemas/mood-tags-filter.schema";

export const WishlistQuerySchema = PaginatedSearchQuerySchema.unwrap()
	.extend({ mood_tags: MoodTagsFilterSchema.optional() })
	.readonly();

export type WishlistQuery = z.infer<typeof WishlistQuerySchema>;
