import z from "zod";

export const ReplaceFavoriteTagsSchema = z
	.object({
		tags: z.array(z.string().trim().min(1).max(40))
	})
	.strict()
	.readonly();
