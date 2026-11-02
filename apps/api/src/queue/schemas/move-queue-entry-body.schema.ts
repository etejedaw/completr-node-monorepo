import z from "zod";

export const MoveQueueEntryBodySchema = z
	.object({
		position: z.number().int().min(1).max(2_147_483_647)
	})
	.strict()
	.readonly();
