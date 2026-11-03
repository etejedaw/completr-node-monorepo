import type z from "zod";

import { type BulkDeleteGameShelfSchema } from "../schemas/bulk-delete-game-shelf.schema";

export type BulkDeleteGameShelfDto = z.infer<typeof BulkDeleteGameShelfSchema>;
