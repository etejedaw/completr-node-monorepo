import type z from "zod";

import { type BulkUpdateBacklogSchema } from "../schemas/bulk-update-backlog.schema";

export type BulkUpdateBacklogDto = z.infer<typeof BulkUpdateBacklogSchema>;
