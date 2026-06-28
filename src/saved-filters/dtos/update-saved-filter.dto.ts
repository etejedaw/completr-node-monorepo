import type z from "zod";

import { type UpdateSavedFilterSchema } from "../schemas/update-saved-filter.schema";

export type UpdateSavedFilterDto = z.infer<typeof UpdateSavedFilterSchema>;
