import z from "zod";

export const AddWishlistSchema = z
	.object({
		gameId: z.uuid(),
		platformId: z.uuid().optional()
	})
	.strict()
	.readonly();
