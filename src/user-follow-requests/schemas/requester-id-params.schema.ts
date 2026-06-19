import z from "zod";

export const RequesterIdParamSchema = z
	.object({
		requesterId: z.string().uuid()
	})
	.strict()
	.readonly();

export type RequesterIdParam = z.infer<typeof RequesterIdParamSchema>;
