import z from "zod";

export const GamesQuerySchema = z
	.object({
		limit: z.coerce.number().int().min(1).max(100).default(50),
		offset: z.coerce.number().int().min(0).default(0),
		sort_by: z
			.enum(["createdAt", "title", "releaseAt"])
			.default("createdAt"),
		sort_order: z.enum(["asc", "desc"]).default("desc"),
		genre: z.string().optional()
	})
	.strict()
	.readonly();

export type GamesQuery = z.infer<typeof GamesQuerySchema>;
