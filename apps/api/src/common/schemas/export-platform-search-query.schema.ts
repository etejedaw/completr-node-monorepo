import z from "zod";

import { ANY_PLATFORM } from "../utils/platform-filter-where.util";
import { PaginatedSearchQuerySchema } from "./paginated-search-query.schema";

export const ExportPlatformSearchQuerySchema =
	PaginatedSearchQuerySchema.unwrap()
		.pick({ search: true })
		.extend({
			platform: z.union([z.uuid(), z.literal(ANY_PLATFORM)]).optional()
		})
		.readonly();

export type ExportPlatformSearchQuery = z.infer<
	typeof ExportPlatformSearchQuerySchema
>;
