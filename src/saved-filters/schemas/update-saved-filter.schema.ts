import z from "zod";
import { SORT_ORDERS } from "../saved-filter.model";

export const UpdateSavedFilterSchema = z
	.object({
		name: z.string().min(1).max(100).optional(),
		description: z.string().max(255).optional(),
		filters: z.record(z.string(), z.unknown()).optional(),
		sortBy: z.string().max(50).optional(),
		sortOrder: z.enum(SORT_ORDERS).optional(),
		showInBacklog: z.boolean().optional()
	})
	.strict()
	.readonly();
