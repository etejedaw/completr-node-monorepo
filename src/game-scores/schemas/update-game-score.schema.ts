import z from "zod";

export const UpdateGameScoreSchema = z
	.object({
		score: z.number()
	})
	.strict()
	.readonly();
