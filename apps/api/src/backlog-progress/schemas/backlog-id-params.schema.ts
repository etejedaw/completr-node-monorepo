import z from "zod";

export const BacklogIdParamsSchema = z
	.object({
		backlogId: z.uuid()
	})
	.strict()
	.readonly();
