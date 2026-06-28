import type z from "zod";

import { type RegisterSavedFilterSchema } from "../schemas/register-saved-filter.schema";

export type RegisterSavedFilterDto = z.infer<typeof RegisterSavedFilterSchema>;
