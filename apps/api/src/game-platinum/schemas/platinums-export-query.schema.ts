import type z from "zod";

import { ExportPlatformSearchQuerySchema } from "../../common/schemas/export-platform-search-query.schema";
import { MoodTagsFilterSchema } from "../../mood-tags/schemas/mood-tags-filter.schema";

export const PlatinumsExportQuerySchema =
	ExportPlatformSearchQuerySchema.unwrap()
		.extend({ mood_tags: MoodTagsFilterSchema.optional() })
		.readonly();

export type PlatinumsExportQuery = z.infer<typeof PlatinumsExportQuerySchema>;
