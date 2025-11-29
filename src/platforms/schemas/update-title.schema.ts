import z from "zod";

export const UpdateTitleSchema = z
	.object({
		title: z.string().max(100).nonempty()
	})
	.strict()
	.readonly();
