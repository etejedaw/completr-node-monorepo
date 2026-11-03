import type z from "zod";

import { type BulkDeletePlatinumsSchema } from "../schemas/bulk-delete-platinums.schema";

export type BulkDeletePlatinumsDto = z.infer<typeof BulkDeletePlatinumsSchema>;
