import z from "zod";

export const UpdateTitleSchema = z
	.object({
		title: z.string().max(200).nonempty()
	})
	.strict()
	.readonly();
