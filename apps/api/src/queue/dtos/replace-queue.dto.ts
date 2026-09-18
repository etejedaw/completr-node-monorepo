import type z from "zod";

import { type ReplaceQueueSchema } from "../schemas/replace-queue.schema";

export type ReplaceQueueDto = z.infer<typeof ReplaceQueueSchema>;
