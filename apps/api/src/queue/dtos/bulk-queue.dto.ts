import type z from "zod";

import { type BulkQueueSchema } from "../schemas/bulk-queue.schema";

export type BulkQueueDto = z.infer<typeof BulkQueueSchema>;
