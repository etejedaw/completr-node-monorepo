import type z from "zod";

import { type CreateDataRequestSchema } from "../schemas/create-data-request.schema";

export type CreateDataRequestDto = z.infer<typeof CreateDataRequestSchema>;
