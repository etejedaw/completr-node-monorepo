import z from "zod";

export const QUEUE_SOURCES = ["game", "backlog"] as const;

export const AddQueueQuerySchema = z
	.object({
		source: z.enum(QUEUE_SOURCES)
	})
	.strict()
	.readonly();

export type AddQueueQuery = z.infer<typeof AddQueueQuerySchema>;
