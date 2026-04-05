import z from "zod";
import { BACKLOG_STATUSES } from "../backlog.model";

export const RegisterBacklogSchema = z
	.object({
		gameId: z.uuid(),
		platformId: z.uuid(),
		status: z.enum(BACKLOG_STATUSES).optional(),
		startedAt: z.iso.date().optional(),
		finishedAt: z.iso.date().optional(),
		realDuration: z.number().positive().optional(),
		score: z.number().positive(),
		duration: z.number().positive(),
		userRating: z
			.number()
			.min(1)
			.max(10)
			.refine(v => (v * 10) % 5 === 0, {
				message: "userRating must be in steps of 0.5"
			})
			.optional(),
		isPublic: z.boolean().optional(),
		notes: z.string().optional()
	})
	.strict()
	.readonly();
