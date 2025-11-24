import z from "zod";

export const UsernameParamsSchema = z
	.object({
		username: z.string()
	})
	.strict()
	.readonly();

export type UsernameParams = z.infer<typeof UsernameParamsSchema>;
