import z from "zod";

import { PaginatedSearchQuerySchema } from "../../common/schemas/paginated-search-query.schema";

export const GameShelfQuerySchema = PaginatedSearchQuerySchema.unwrap()
	.extend({
		game_id: z.uuid().optional()
	})
	.strict()
	.readonly();

export type GameShelfQuery = z.infer<typeof GameShelfQuerySchema>;
