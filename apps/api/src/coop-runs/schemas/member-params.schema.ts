import z from "zod";

export const MemberParamsSchema = z
	.object({
		backlogId: z.uuid(),
		userId: z.uuid()
	})
	.strict()
	.readonly();
