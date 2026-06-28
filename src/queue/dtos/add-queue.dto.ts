import z from "zod";

import { AddQueueBodySchema } from "../schemas/add-queue-body.schema";

export type AddQueueDto = z.infer<typeof AddQueueBodySchema>;
