import type z from "zod";

import { type AddProgressSchema } from "../schemas/add-progress.schema";

export type AddProgressDto = z.infer<typeof AddProgressSchema>;
