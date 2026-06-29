import type z from "zod";

import { type UpdateListSchema } from "../schemas/update-list.schema";

export type UpdateListDto = z.infer<typeof UpdateListSchema>;
