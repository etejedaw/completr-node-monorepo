import z from "zod";

export const GameIdParamsSchema = z
	.object({
		gameId: z.uuid()
	})
	.strict()
	.readonly();
