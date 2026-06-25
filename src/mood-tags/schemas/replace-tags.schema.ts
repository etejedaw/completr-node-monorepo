import z from "zod";

export const ReplaceTagsSchema = z
	.object({
		tags: z.array(z.string().trim().min(1).max(40)).max(10)
	})
	.strict()
	.readonly();
