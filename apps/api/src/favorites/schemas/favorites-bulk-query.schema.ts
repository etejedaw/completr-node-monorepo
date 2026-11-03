import type z from "zod";

import { buildBulkActionQuerySchema } from "../../common/schemas/bulk-action-query.schema";
import { FAVORITES_BULK_ACTIONS } from "../favorites.constants";

export const FavoritesBulkQuerySchema = buildBulkActionQuerySchema(
	FAVORITES_BULK_ACTIONS
);

export type FavoritesBulkQuery = z.infer<typeof FavoritesBulkQuerySchema>;
