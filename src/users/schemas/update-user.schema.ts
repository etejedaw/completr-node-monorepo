import z from "zod";
import { THEME_IDS } from "../theme-catalog";
import { VISIBILITY_LEVELS } from "../visibility.constants";

const visibility = z.enum(VISIBILITY_LEVELS).optional();

export const UpdateUserSchema = z
	.object({
		name: z.string().min(1).max(80).nonempty().optional(),
		bio: z.string().min(1).max(250).nonempty().optional(),
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
