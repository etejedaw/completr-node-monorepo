import type z from "zod";

import { type RegisterBacklogSchema } from "../schemas/register-backlog.schema";

export type RegisterBacklogDto = z.infer<typeof RegisterBacklogSchema>;
