import type z from "zod";

import { type AddQueueBodySchema } from "../schemas/add-queue-body.schema";

export type AddQueueDto = z.infer<typeof AddQueueBodySchema>;
