import z from "zod";

export const UserIdParamSchema = z
	.object({
		userId: z.uuid()
	})
	.readonly();

export type UserIdParam = z.infer<typeof UserIdParamSchema>;
