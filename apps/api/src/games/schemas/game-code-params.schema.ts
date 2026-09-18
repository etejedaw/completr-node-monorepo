import z from "zod";

export const GameCodeParamSchema = z
	.object({
		code: z.string()
	})
	.strict()
	.readonly();

export type GameCodeParam = z.infer<typeof GameCodeParamSchema>;
