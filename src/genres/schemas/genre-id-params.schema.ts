import z from "zod";

export const GenreIdParamSchema = z
	.object({
		genreId: z.string()
	})
	.strict()
	.readonly();

export type GenreIdParam = z.infer<typeof GenreIdParamSchema>;
