import z from "zod";

import {
	APPEARANCE_COLORS,
	APPEARANCE_ICONS
} from "../../common/constants/appearance.constants";
import { SORT_ORDERS, STAT_KEYS } from "../saved-filter.model";
import { SavedFilterFiltersSchema } from "./saved-filter-filters.schema";

export const RegisterSavedFilterSchema = z
	.object({
		name: z.string().min(1).max(100),
		description: z.string().max(255).optional(),
		filters: SavedFilterFiltersSchema,
		sortBy: z.string().max(50).optional(),
		sortOrder: z.enum(SORT_ORDERS).optional(),
		showInBacklog: z.boolean().optional(),
		isDefault: z.boolean().optional(),
		enabledStats: z.array(z.enum(STAT_KEYS)).nullable().optional(),
		icon: z.enum(APPEARANCE_ICONS).nullable().optional(),
		color: z.enum(APPEARANCE_COLORS).nullable().optional()
	})
	.strict()
	.readonly();
