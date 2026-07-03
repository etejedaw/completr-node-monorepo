import type z from "zod";

import { type ReorderSavedFiltersSchema } from "../schemas/reorder-saved-filters.schema";

export type ReorderSavedFiltersDto = z.infer<typeof ReorderSavedFiltersSchema>;
