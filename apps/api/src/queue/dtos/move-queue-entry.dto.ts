import type z from "zod";

import { type MoveQueueEntryBodySchema } from "../schemas/move-queue-entry-body.schema";

export type MoveQueueEntryDto = z.infer<typeof MoveQueueEntryBodySchema>;
