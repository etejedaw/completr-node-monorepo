import z from "zod";

export const ReplaceWishlistSchema = z
	.object({
		backlogIds: z
			.uuid()
			.array()
			.refine(ids => new Set(ids).size === ids.length, {
				message: "Duplicate backlogIds are not allowed"
			})
	})
	.strict()
	.readonly();

export type ReplaceWishlistBody = z.infer<typeof ReplaceWishlistSchema>;
