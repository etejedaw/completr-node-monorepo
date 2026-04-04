import z from "zod";

export const GameTimeIdParamsSchema = z
	.object({
		gameId: z.uuid(),
		source: z.enum(["hltb", "rawg"])
	})
	.strict()
	.readonly();

export type GameTimeIdParams = z.infer<typeof GameTimeIdParamsSchema>;
