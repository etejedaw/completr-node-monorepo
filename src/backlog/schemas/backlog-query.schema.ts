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
	"createdAt"
] as const;

export const BacklogQuerySchema = z
	.object({
		status: z.enum(BACKLOG_STATUSES).optional(),
		game_id: z.uuid().optional(),
		platform_id: z.uuid().optional(),
		started_from: z.iso.date().optional(),
		started_to: z.iso.date().optional(),
		finished_from: z.iso.date().optional(),
		finished_to: z.iso.date().optional(),
		min_score: z.coerce.number().optional(),
		max_score: z.coerce.number().optional(),
		min_duration: z.coerce.number().optional(),
		max_duration: z.coerce.number().optional(),
		min_rating: z.coerce.number().optional(),
		max_rating: z.coerce.number().optional(),
		sort_by: z.enum(SORT_FIELDS).optional(),
		sort_order: z.enum(["asc", "desc"]).optional()
	})
	.readonly();

export type BacklogQuery = z.infer<typeof BacklogQuerySchema>;
