import type z from "zod";

import { buildBulkActionQuerySchema } from "../../common/schemas/bulk-action-query.schema";
import { GAME_SHELF_BULK_ACTIONS } from "../game-shelf.constants";

export const GameShelfBulkQuerySchema = buildBulkActionQuerySchema(
	GAME_SHELF_BULK_ACTIONS
);

export type GameShelfBulkQuery = z.infer<typeof GameShelfBulkQuerySchema>;
