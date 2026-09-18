import z from "zod";

export const AddQueueBodySchema = z
	.object({
		id: z.uuid(),
		platformId: z.uuid().optional()
	})
	.strict()
	.readonly();

export type AddQueueBody = z.infer<typeof AddQueueBodySchema>;
