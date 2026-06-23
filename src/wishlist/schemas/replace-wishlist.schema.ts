import z from "zod";

export const ReplaceWishlistSchema = z
	.object({
		gameIds: z
			.uuid()
			.array()
			.max(100)
			.refine(ids => new Set(ids).size === ids.length, {
				message: "Duplicate gameIds are not allowed"
			})
	})
	.strict()
	.readonly();

export type ReplaceWishlistBody = z.infer<typeof ReplaceWishlistSchema>;
