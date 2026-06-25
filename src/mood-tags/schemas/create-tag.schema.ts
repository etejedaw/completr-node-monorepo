import z from "zod";

export const CreateTagSchema = z
	.object({
		tag: z.string().min(1).max(40),
		description: z.string().max(255).nullable().optional()
	})
	.strict()
	.readonly();
