import z from "zod";
import { SORT_ORDERS } from "../saved-filter.model";

export const RegisterSavedFilterSchema = z
	.object({
		name: z.string().min(1).max(100),
		filters: z.record(z.string(), z.unknown()),
		sortBy: z.string().max(50).optional(),
		sortOrder: z.enum(SORT_ORDERS).optional()
	})
	.strict()
	.readonly();
