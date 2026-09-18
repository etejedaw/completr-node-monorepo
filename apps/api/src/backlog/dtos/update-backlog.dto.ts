import type z from "zod";

import { type UpdateBacklogSchema } from "../schemas/update-backlog.schema";

export type UpdateBacklogDto = z.infer<typeof UpdateBacklogSchema>;
