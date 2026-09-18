import { type z } from "zod";

import { type DuplicateListSchema } from "../schemas/duplicate-list.schema";

export type DuplicateListDto = z.infer<typeof DuplicateListSchema>;
