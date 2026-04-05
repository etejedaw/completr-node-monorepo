import z from "zod";

export const UpdateListItemSchema = z
	.object({
		position: z.number().int().min(1)
	})
	.strict()
	.readonly();
