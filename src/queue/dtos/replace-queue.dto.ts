import z from "zod";

import { ReplaceQueueSchema } from "../schemas/replace-queue.schema";

export type ReplaceQueueDto = z.infer<typeof ReplaceQueueSchema>;
