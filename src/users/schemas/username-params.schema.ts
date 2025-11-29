import z from "zod";

export const UsernameParamSchema = z
	.object({
		username: z.string()
	})
	.strict()
	.readonly();

export type UsernameParam = z.infer<typeof UsernameParamSchema>;
