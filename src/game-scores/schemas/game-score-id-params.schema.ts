import z from "zod";

export const GameScoreIdParamsSchema = z
	.object({
		gameId: z.uuid(),
		source: z.enum(["metacritic", "opencritic", "rawg"])
	})
	.strict()
	.readonly();

export type GameScoreIdParams = z.infer<typeof GameScoreIdParamsSchema>;
