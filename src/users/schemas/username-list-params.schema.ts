import z from "zod";

export const UsernameListParamsSchema = z
	.object({
		username: z.string().min(1),
		listId: z.uuid()
	})
	.readonly();

export type UsernameListParams = z.infer<typeof UsernameListParamsSchema>;
