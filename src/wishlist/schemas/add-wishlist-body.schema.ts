import z from "zod";

export const AddWishlistBodySchema = z
	.object({
		id: z.uuid(),
		platformId: z.uuid().optional()
	})
	.strict()
	.readonly();

export type AddWishlistBody = z.infer<typeof AddWishlistBodySchema>;
