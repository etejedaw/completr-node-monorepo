import type z from "zod";

import { type SyncSchema } from "../schemas/sync.schema";

export type SyncDto = z.infer<typeof SyncSchema>;
