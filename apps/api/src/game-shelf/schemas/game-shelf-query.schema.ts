import z from "zod";

import { PaginatedSearchQuerySchema } from "../../common/schemas/paginated-search-query.schema";
import { MoodTagsFilterSchema } from "../../mood-tags/schemas/mood-tags-filter.schema";

export const GameShelfQuerySchema = PaginatedSearchQuerySchema.unwrap()
	.extend({
		game_id: z.uuid().optional(),
		mood_tags: MoodTagsFilterSchema.optional()
	})
	.strict()
	.readonly();

export type GameShelfQuery = z.infer<typeof GameShelfQuerySchema>;
