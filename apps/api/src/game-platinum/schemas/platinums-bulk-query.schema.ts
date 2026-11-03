import type z from "zod";

import { buildBulkActionQuerySchema } from "../../common/schemas/bulk-action-query.schema";
import { PLATINUMS_BULK_ACTIONS } from "../game-platinum.constants";

export const PlatinumsBulkQuerySchema = buildBulkActionQuerySchema(
	PLATINUMS_BULK_ACTIONS
);

export type PlatinumsBulkQuery = z.infer<typeof PlatinumsBulkQuerySchema>;
