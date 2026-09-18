import z from "zod";

export const TagNameParamsSchema = z
	.object({
		tag: z.string().min(1).max(40)
	})
	.strict()
	.readonly();
