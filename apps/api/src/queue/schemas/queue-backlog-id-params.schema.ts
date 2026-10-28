import z from "zod";

export const QueueBacklogIdParamsSchema = z
	.object({
		backlogId: z.uuid()
	})
	.strict()
	.readonly();

export type QueueBacklogIdParams = z.infer<typeof QueueBacklogIdParamsSchema>;
