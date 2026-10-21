import z from "zod";

export const UpdateGameScoreSchema = z
	.object({
		score: z.number().min(0)
	})
	.strict()
	.readonly();
