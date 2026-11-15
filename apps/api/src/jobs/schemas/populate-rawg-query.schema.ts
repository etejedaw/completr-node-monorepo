import z from "zod";

export const PopulateRawgQuerySchema = z
	.object({
		limit: z.coerce.number().int().positive().optional()
	})
	.strict()
	.readonly();

export type PopulateRawgQuery = z.infer<typeof PopulateRawgQuerySchema>;
