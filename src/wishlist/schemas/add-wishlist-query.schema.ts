import z from "zod";

export const WISHLIST_SOURCES = ["game", "backlog"] as const;

export const AddWishlistQuerySchema = z
	.object({
		source: z.enum(WISHLIST_SOURCES)
	})
	.strict()
	.readonly();

export type AddWishlistQuery = z.infer<typeof AddWishlistQuerySchema>;
