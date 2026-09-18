import z from "zod";

export const GenreCodeParamsSchema = z
	.object({
		code: z.string().nonempty()
	})
	.strict()
	.readonly();

export type GenreCodeParam = z.infer<typeof GenreCodeParamsSchema>;
