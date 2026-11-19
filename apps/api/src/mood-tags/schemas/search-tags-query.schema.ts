import z from "zod";

export const SearchTagsQuerySchema = z
	.object({
		search: z.string().min(1).max(40),
		limit: z.coerce.number().int().min(1).max(20).default(10)
	})
	.strict()
	.readonly();

export type SearchTagsQuery = z.infer<typeof SearchTagsQuerySchema>;
