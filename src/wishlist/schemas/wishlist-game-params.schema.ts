import z from "zod";

export const WishlistGameParamsSchema = z
	.object({
		gameId: z.uuid()
	})
	.strict()
	.readonly();

export type WishlistGameParams = z.infer<typeof WishlistGameParamsSchema>;
