import z from "zod";

export const ActivityIdParamsSchema = z
	.object({
		activityId: z.uuid()
	})
	.strict()
	.readonly();
