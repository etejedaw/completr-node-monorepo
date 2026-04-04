import z from "zod";

export const GameScoreParamsSchema = z
	.object({
		gameId: z.uuid()
	})
	.strict()
	.readonly();

export type GameScoreParams = z.infer<typeof GameScoreParamsSchema>;
