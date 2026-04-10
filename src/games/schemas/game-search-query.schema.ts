import z from "zod";

export const GameSearchQuerySchema = z
	.object({
		query: z.string().min(1).max(200),
		force_rawg: z.coerce.boolean().optional()
	})
	.strict()
	.readonly();

export type GameSearchQuery = z.infer<typeof GameSearchQuerySchema>;
