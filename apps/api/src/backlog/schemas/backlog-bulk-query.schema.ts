import type z from "zod";

import { buildBulkActionQuerySchema } from "../../common/schemas/bulk-action-query.schema";
import { BACKLOG_BULK_ACTIONS } from "../backlog.constants";

export const BacklogBulkQuerySchema =
	buildBulkActionQuerySchema(BACKLOG_BULK_ACTIONS);

export type BacklogBulkQuery = z.infer<typeof BacklogBulkQuerySchema>;
