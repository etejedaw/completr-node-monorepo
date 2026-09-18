import z from "zod";

export const UpdateGameTimeSchema = z
	.object({
		duration: z.number()
	})
	.strict()
	.readonly();
