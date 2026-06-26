import z from "zod";
import { BACKLOG_STATUSES } from "../backlog.model";

const SORT_FIELDS = [
	"status",
	"score",
	"duration",
	"startedAt",
	"finishedAt",
	"realDuration",
	"userRating",
	"createdAt",
	"title",
	"ratio",
	"personalRatio"
] as const;

export const BacklogQuerySchema = z
	.object({
		status: z
			.string()
			.transform(val => val.split(","))
			.pipe(z.enum(BACKLOG_STATUSES).array().min(1))
			.optional(),
		game_id: z.uuid().optional(),
		platform_id: z.uuid().optional(),
		platforms: z
			.string()
			.transform(val => val.split(",").filter(Boolean))
			.optional(),
		genres: z
			.string()
			.transform(val => val.split(",").filter(Boolean))
			.optional(),
		release_year_from: z.coerce.number().int().optional(),
		release_year_to: z.coerce.number().int().optional(),
		started_from: z.iso.date().optional(),
		started_to: z.iso.date().optional(),
		finished_from: z.iso.date().optional(),
		finished_to: z.iso.date().optional(),
		active_from: z.iso.date().optional(),
		active_to: z.iso.date().optional(),
		no_finished_date: z.stringbool().optional(),
		min_score: z.coerce.number().optional(),
		max_score: z.coerce.number().optional(),
		min_duration: z.coerce.number().optional(),
		max_duration: z.coerce.number().optional(),
		min_real_duration: z.coerce.number().optional(),
		max_real_duration: z.coerce.number().optional(),
		min_rating: z.coerce.number().optional(),
		max_rating: z.coerce.number().optional(),
		min_ratio: z.coerce.number().optional(),
		max_ratio: z.coerce.number().optional(),
		min_personal_ratio: z.coerce.number().optional(),
		max_personal_ratio: z.coerce.number().optional(),
		search: z.string().min(1).max(100).optional(),
		mood_tags: z
			.string()
			.transform(val => val.split(",").filter(Boolean))
			.pipe(z.string().array().min(1))
			.optional(),
		sort_by: z.enum(SORT_FIELDS).optional(),
		sort_order: z.enum(["asc", "desc"]).optional(),
		limit: z.coerce.number().int().min(1).max(100).optional(),
		offset: z.coerce.number().int().min(0).optional()
	})
	.readonly();

export type BacklogQuery = z.infer<typeof BacklogQuerySchema>;
