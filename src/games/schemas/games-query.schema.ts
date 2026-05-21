import z from "zod";

export const GamesQuerySchema = z
	.object({
		limit: z.coerce.number().int().min(1).max(100).default(50),
		offset: z.coerce.number().int().min(0).default(0),
		sort_by: z
			.enum(["createdAt", "title", "releaseAt", "random"])
			.default("createdAt"),
		sort_order: z.enum(["asc", "desc"]).default("desc"),
		genre: z.string().optional(),
		no_scores: z.stringbool().optional(),
		no_times: z.stringbool().optional(),
		no_platforms: z.stringbool().optional()
	})
	.strict()
	.readonly();

export type GamesQuery = z.infer<typeof GamesQuerySchema>;
