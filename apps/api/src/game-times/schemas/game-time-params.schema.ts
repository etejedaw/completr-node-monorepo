import z from "zod";

export const GameTimeParamsSchema = z
	.object({
		gameId: z.uuid()
	})
	.strict()
	.readonly();

export type GameTimeParams = z.infer<typeof GameTimeParamsSchema>;
