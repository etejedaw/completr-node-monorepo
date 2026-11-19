import z from "zod";

import {
	APPEARANCE_COLORS,
	APPEARANCE_ICONS
} from "../../common/constants/appearance.constants";

export const CreateTagSchema = z
	.object({
		tag: z.string().min(1).max(40),
		description: z.string().max(255).nullable().optional(),
		icon: z.enum(APPEARANCE_ICONS).nullable().optional(),
		color: z.enum(APPEARANCE_COLORS).nullable().optional()
	})
	.strict()
	.readonly();
