import z from "zod";
import { BACKLOG_STATUSES } from "../backlog.model";
import { isStepOfHalf } from "../utils/is-step-of-half.util";

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
			.min(0.5)
			.max(5)
			.refine(isStepOfHalf, {
				message: "userRating must be in steps of 0.5"
			})
			.optional(),
		isPublic: z.boolean().optional(),
		notes: z.string().optional(),
		compilationGameId: z.uuid().optional()
	})
	.strict()
	.readonly();
