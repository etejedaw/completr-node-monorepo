import z from "zod";

export const GameShelfIdParamSchema = z
	.object({
		gameShelfId: z.uuid()
	})
	.strict()
	.readonly();

export type GameShelfIdParam = z.infer<typeof GameShelfIdParamSchema>;
