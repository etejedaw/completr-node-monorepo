import z from "zod";

export const DuplicateListSchema = z
	.object({
		name: z.string().min(1).max(100),
		isPublic: z.boolean().optional()
	})
	.strict()
	.readonly();
