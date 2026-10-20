import z from "zod";

export const ActivityIdParamsSchema = z
	.object({
		activityId: z.uuid()
	})
	.strict()
	.readonly();

export type ActivityIdParams = z.infer<typeof ActivityIdParamsSchema>;
