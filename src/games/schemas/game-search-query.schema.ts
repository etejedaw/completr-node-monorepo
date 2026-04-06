import z from "zod";

export const GameSearchQuerySchema = z
	.object({
		query: z.string().min(1).max(200)
	})
	.strict()
	.readonly();

export type GameSearchQuery = z.infer<typeof GameSearchQuerySchema>;
