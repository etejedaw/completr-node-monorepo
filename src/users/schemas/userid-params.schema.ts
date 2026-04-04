import z from "zod";

export const UserIdParamsSchema = z
	.object({
		userId: z.uuid()
	})
	.strict()
	.readonly();

export type UserIdParams = z.infer<typeof UserIdParamsSchema>;
