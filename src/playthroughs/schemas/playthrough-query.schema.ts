import z from "zod";

export const PlaythroughQuerySchema = z
	.object({
		status: z
			.enum(["not_started", "playing", "completed", "abandoned"])
			.optional(),
		game_id: z.uuid().optional(),
		from: z.iso.date().optional(),
		to: z.iso.date().optional()
	})
	.strict()
	.readonly();

export type PlaythroughQuery = z.infer<typeof PlaythroughQuerySchema>;
