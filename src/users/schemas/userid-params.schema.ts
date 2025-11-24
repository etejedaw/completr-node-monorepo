import z from "zod";

export const UserIdParamsSchema = z
	.object({
		userId: z.string()
	})
	.strict()
	.readonly();

export type UserIdParams = z.infer<typeof UserIdParamsSchema>;
