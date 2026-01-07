import z from "zod";

export const RegisterGenreSchema = z
	.object({
		name: z.string().max(50).nonempty()
	})
	.readonly()
	.readonly();
