import z from "zod";

export const UpdateGenreSchema = z
	.object({
		name: z.string().max(50).nonempty()
	})
	.strict()
	.readonly();
