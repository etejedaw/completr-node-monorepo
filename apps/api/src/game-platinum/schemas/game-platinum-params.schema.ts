import z from "zod";

export const GamePlatinumParamsSchema = z
	.object({
		gameId: z.uuid()
	})
	.strict()
	.readonly();

export type GamePlatinumParams = z.infer<typeof GamePlatinumParamsSchema>;
