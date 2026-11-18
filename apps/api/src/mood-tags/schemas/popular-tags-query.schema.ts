import z from "zod";

export const PopularTagsQuerySchema = z
	.object({
		limit: z.coerce.number().int().min(1).max(50).default(20)
	})
	.strict()
	.readonly();

export type PopularTagsQuery = z.infer<typeof PopularTagsQuerySchema>;
