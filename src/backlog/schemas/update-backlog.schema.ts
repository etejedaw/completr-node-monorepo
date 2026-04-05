import z from "zod";
import { BACKLOG_STATUSES } from "../backlog.model";
import { isStepOfHalf } from "../utils/is-step-of-half.util";

export const UpdateBacklogSchema = z
	.object({
		status: z.enum(BACKLOG_STATUSES).optional(),
		startedAt: z.iso.date().optional(),
		finishedAt: z.iso.date().optional(),
		realDuration: z.number().positive().optional(),
		score: z.number().positive().optional(),
		duration: z.number().positive().optional(),
		userRating: z
			.number()
			.min(1)
			.max(10)
			.refine(isStepOfHalf, {
				message: "userRating must be in steps of 0.5"
			})
			.optional(),
		isPublic: z.boolean().optional(),
		notes: z.string().optional()
	})
	.strict()
	.readonly();
