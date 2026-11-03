import type z from "zod";

import { type BulkDeleteBacklogSchema } from "../schemas/bulk-delete-backlog.schema";

export type BulkDeleteBacklogDto = z.infer<typeof BulkDeleteBacklogSchema>;
