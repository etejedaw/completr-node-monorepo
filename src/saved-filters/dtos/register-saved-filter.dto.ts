import z from "zod";

import { RegisterSavedFilterSchema } from "../schemas/register-saved-filter.schema";

export type RegisterSavedFilterDto = z.infer<typeof RegisterSavedFilterSchema>;
