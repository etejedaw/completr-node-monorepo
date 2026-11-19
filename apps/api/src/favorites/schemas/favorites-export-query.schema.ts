import type z from "zod";

import { ExportSearchQuerySchema } from "../../common/schemas/export-search-query.schema";
import { MoodTagsFilterSchema } from "../../mood-tags/schemas/mood-tags-filter.schema";

export const FavoritesExportQuerySchema = ExportSearchQuerySchema.unwrap()
	.extend({ mood_tags: MoodTagsFilterSchema.optional() })
	.readonly();

export type FavoritesExportQuery = z.infer<typeof FavoritesExportQuerySchema>;
