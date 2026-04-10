import z from "zod";

export const RegisterScoreSourceSchema = z
	.object({
		code: z.string().min(1).max(50),
		name: z.string().min(1).max(100),
		scale: z.number().int().positive()
	})
	.strict()
	.readonly();

export type RegisterScoreSourceDto = z.infer<typeof RegisterScoreSourceSchema>;
