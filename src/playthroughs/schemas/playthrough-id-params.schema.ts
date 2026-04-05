import z from "zod";

export const PlaythroughIdParamsSchema = z
	.object({
		playthroughId: z.uuid()
	})
	.strict()
	.readonly();

export type PlaythroughIdParams = z.infer<typeof PlaythroughIdParamsSchema>;
