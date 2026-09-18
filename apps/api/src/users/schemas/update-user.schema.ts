import z from "zod";

import { SafeTextSchema } from "../../common/schemas/safe-text.schema";
import { THEME_IDS } from "../constants/theme.constants";
import { VISIBILITY_LEVELS } from "../constants/visibility.constants";

const visibility = z.enum(VISIBILITY_LEVELS).optional();

export const UpdateUserSchema = z
	.object({
		name: SafeTextSchema.min(1).max(80).nonempty().optional(),
		bio: SafeTextSchema.min(1).max(250).nonempty().optional(),
		avatarUrl: z.string().nonempty().optional(),
		profileVisibility: visibility,
		queueVisibility: visibility,
		wishlistVisibility: visibility,
		favoriteVisibility: visibility,
		feedVisibility: visibility,
		backlogVisibility: visibility,
		shelfVisibility: visibility,
		listVisibility: visibility,
		acceptFollowRequests: z.boolean().optional(),
		theme: z.enum(THEME_IDS as [string, ...string[]]).optional()
	})
	.strict()
	.readonly();
