import type z from "zod";

import { type RejectDataRequestSchema } from "../schemas/reject-data-request.schema";

export type RejectDataRequestDto = z.infer<typeof RejectDataRequestSchema>;
