import z from "zod";
import { THEME_IDS } from "../theme-catalog";

export const UpdateUserSchema = z
	.object({
		name: z.string().min(1).max(80).nonempty().optional(),
		bio: z.string().min(1).max(250).nonempty().optional(),
		avatarUrl: z.string().nonempty().optional(),
		isPublic: z.boolean().optional(),
		isQueuePublic: z.boolean().optional(),
		isWishlistPublic: z.boolean().optional(),
		isFavoritePublic: z.boolean().optional(),
		isFeedPublic: z.boolean().optional(),
		isBacklogPublic: z.boolean().optional(),
		isShelfPublic: z.boolean().optional(),
		isListPublic: z.boolean().optional(),
		acceptFollowRequests: z.boolean().optional(),
		theme: z.enum(THEME_IDS as [string, ...string[]]).optional()
	})
	.strict()
	.readonly();
