import z from "zod";

export const GameIdParamSchema = z
	.object({
		id: z.string()
	})
	.strict()
	.readonly();

export type GameIdParam = z.infer<typeof GameIdParamSchema>;
