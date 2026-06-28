import z from "zod";

import { SyncSchema } from "../schemas/sync.schema";

export type SyncDto = z.infer<typeof SyncSchema>;
