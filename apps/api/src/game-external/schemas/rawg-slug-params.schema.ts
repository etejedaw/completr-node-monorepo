import z from "zod";

export const RawgSlugParamSchema = z
	.object({
		slug: z.string().min(1).max(200)
	})
	.strict()
	.readonly();

export type RawgSlugParam = z.infer<typeof RawgSlugParamSchema>;
