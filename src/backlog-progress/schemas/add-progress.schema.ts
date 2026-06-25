import z from "zod";

export const AddProgressSchema = z
	.object({
		note: z.string().trim().min(1).max(500)
	})
	.strict()
	.readonly();
