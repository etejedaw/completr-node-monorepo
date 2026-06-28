import z from "zod";

import { AddProgressSchema } from "../schemas/add-progress.schema";

export type AddProgressDto = z.infer<typeof AddProgressSchema>;
