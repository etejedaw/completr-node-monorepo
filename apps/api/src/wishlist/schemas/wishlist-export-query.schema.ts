import type z from "zod";

import { ExportPlatformSearchQuerySchema } from "../../common/schemas/export-platform-search-query.schema";
import { MoodTagsFilterSchema } from "../../mood-tags/schemas/mood-tags-filter.schema";

export const WishlistExportQuerySchema =
	ExportPlatformSearchQuerySchema.unwrap()
		.extend({ mood_tags: MoodTagsFilterSchema.optional() })
		.readonly();

export type WishlistExportQuery = z.infer<typeof WishlistExportQuerySchema>;
