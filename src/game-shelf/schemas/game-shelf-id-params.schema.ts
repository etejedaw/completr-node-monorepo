import z from "zod";

export const GameShelfIdParamSchema = z
	.object({
		gameShelfId: z.string()
	})
	.strict()
	.readonly();

export type GameShelfIdParam = z.infer<typeof GameShelfIdParamSchema>;
