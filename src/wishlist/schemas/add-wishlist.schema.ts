import z from "zod";

export const AddWishlistSchema = z
	.object({
		gameId: z.uuid()
	})
	.strict()
	.readonly();

export type AddWishlistBody = z.infer<typeof AddWishlistSchema>;
