import z from "zod";

import {
	SAVED_FILTER_COLORS,
	SAVED_FILTER_ICONS,
	SORT_ORDERS,
	STAT_KEYS
} from "../saved-filter.model";

export const UpdateSavedFilterSchema = z
	.object({
		name: z.string().min(1).max(100).optional(),
		description: z.string().max(255).optional(),
		filters: z.record(z.string(), z.unknown()).optional(),
		sortBy: z.string().max(50).optional(),
		sortOrder: z.enum(SORT_ORDERS).optional(),
		showInBacklog: z.boolean().optional(),
		isDefault: z.boolean().optional(),
		enabledStats: z.array(z.enum(STAT_KEYS)).nullable().optional(),
		icon: z.enum(SAVED_FILTER_ICONS).nullable().optional(),
		color: z.enum(SAVED_FILTER_COLORS).nullable().optional()
	})
	.strict()
	.readonly();
