import z from "zod";

export const SearchQuerySchema = z
	.object({
		query: z.string().min(1)
	})
	.strict()
	.readonly();

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
