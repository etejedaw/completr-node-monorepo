import z from "zod";

export const ExternalSlugParamSchema = z
	.object({
		slug: z.string().min(1).max(200)
	})
	.strict()
	.readonly();

export type ExternalSlugParam = z.infer<typeof ExternalSlugParamSchema>;
