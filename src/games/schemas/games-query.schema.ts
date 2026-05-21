import z from "zod";

const csv = () =>
	z
		.string()
		.transform(val => val.split(",").filter(Boolean))
		.pipe(z.string().array().min(1));

export const GamesQuerySchema = z
	.object({
		limit: z.coerce.number().int().min(1).max(100).default(50),
		offset: z.coerce.number().int().min(0).default(0),
		sort_by: z
			.enum(["createdAt", "title", "releaseAt", "random"])
			.default("createdAt"),
		sort_order: z.enum(["asc", "desc"]).default("desc"),
		search: z.string().min(1).max(100).optional(),
		genre: z.string().optional(),
		genres: csv().optional(),
		platforms: csv().optional(),
		release_year_from: z.coerce
			.number()
			.int()
			.min(1900)
			.max(2100)
			.optional(),
		release_year_to: z.coerce.number().int().min(1900).max(2100).optional(),
		min_score: z.coerce.number().min(0).max(5).optional(),
		max_score: z.coerce.number().min(0).max(5).optional(),
		min_duration: z.coerce.number().min(0).optional(),
		max_duration: z.coerce.number().min(0).optional(),
		is_dlc: z.stringbool().optional(),
		no_scores: z.stringbool().optional(),
		no_times: z.stringbool().optional(),
		no_platforms: z.stringbool().optional(),
		no_score_source: csv().optional(),
		no_time_source: csv().optional()
	})
	.strict()
	.readonly();

export type GamesQuery = z.infer<typeof GamesQuerySchema>;
