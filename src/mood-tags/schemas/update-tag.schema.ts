import z from "zod";

export const UpdateTagSchema = z
	.object({
		newTag: z.string().min(1).max(40).optional(),
		description: z.string().max(255).nullable().optional()
	})
	.strict()
	.refine(
		v => v.newTag !== undefined || v.description !== undefined,
		"At least one of newTag or description is required"
	)
	.readonly();
