import z from "zod";

export const DeleteGameQuerySchema = z
	.object({
		hard: z.stringbool().default(false)
	})
	.strict()
	.readonly();

export type DeleteGameQuery = z.infer<typeof DeleteGameQuerySchema>;
