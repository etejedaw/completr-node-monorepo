import z from "zod";

export const RegisterGameScoreSchema = z
	.object({
		gameId: z.uuid(),
		source: z.enum(["metacritic", "opencritic", "rawg"]),
		score: z.number()
	})
	.strict()
	.readonly();
