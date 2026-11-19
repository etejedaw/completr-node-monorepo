import z from "zod";

import {
	APPEARANCE_COLORS,
	APPEARANCE_ICONS
} from "../../common/constants/appearance.constants";

export const UpdateTagSchema = z
	.object({
		newTag: z.string().min(1).max(40).optional(),
		description: z.string().max(255).nullable().optional(),
		icon: z.enum(APPEARANCE_ICONS).nullable().optional(),
		color: z.enum(APPEARANCE_COLORS).nullable().optional()
	})
	.strict()
	.refine(
		v =>
			v.newTag !== undefined ||
			v.description !== undefined ||
			v.icon !== undefined ||
			v.color !== undefined,
		"At least one of newTag, description, icon or color is required"
	)
	.readonly();
