import z from "zod";
import { SORT_ORDERS } from "../saved-filter.model";

export const UpdateSavedFilterSchema = z
	.object({
		name: z.string().min(1).max(100).optional(),
		filters: z.record(z.unknown()).optional(),
		sortBy: z.string().max(50).optional(),
		sortOrder: z.enum(SORT_ORDERS).optional()
	})
	.strict()
	.readonly();
