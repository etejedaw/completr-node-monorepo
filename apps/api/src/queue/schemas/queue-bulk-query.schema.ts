import type z from "zod";

import { buildBulkActionQuerySchema } from "../../common/schemas/bulk-action-query.schema";
import { QUEUE_BULK_ACTIONS } from "../queue.constants";

export const QueueBulkQuerySchema =
	buildBulkActionQuerySchema(QUEUE_BULK_ACTIONS);

export type QueueBulkQuery = z.infer<typeof QueueBulkQuerySchema>;
