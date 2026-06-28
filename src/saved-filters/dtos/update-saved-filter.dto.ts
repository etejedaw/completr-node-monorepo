import z from "zod";

import { UpdateSavedFilterSchema } from "../schemas/update-saved-filter.schema";

export type UpdateSavedFilterDto = z.infer<typeof UpdateSavedFilterSchema>;
