import z from "zod";

import { BACKLOG_STATUSES } from "../backlog.model";
import { isStepOfHalf } from "../utils/is-step-of-half.util";

export const UpdateBacklogSchema = z
	.object({
		status: z.enum(BACKLOG_STATUSES).optional(),
		startedAt: z.iso.date().nullable().optional(),
		finishedAt: z.iso.date().nullable().optional(),
		realDuration: z.number().positive().nullable().optional(),
		score: z.number().positive().optional(),
		duration: z.number().positive().optional(),
		userRating: z
			.number()
			.min(0.5)
			.max(5)
			.refine(isStepOfHalf, {
				message: "userRating must be in steps of 0.5"
			})
			.nullable()
			.optional(),
		isPublic: z.boolean().optional(),
		notes: z.string().nullable().optional(),
		compilationGameId: z.uuid().nullable().optional()
	})
	.strict()
	.readonly();
