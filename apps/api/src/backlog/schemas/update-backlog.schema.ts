import z from "zod";

import { BACKLOG_STATUSES } from "../backlog.model";
import { isStepOfHalf } from "../utils/is-step-of-half.util";
import {
	BacklogDurationSchema,
	BacklogScoreSchema
} from "./backlog-reference.schema";

export const UpdateBacklogSchema = z
	.object({
		status: z.enum(BACKLOG_STATUSES).optional(),
		startedAt: z.iso.date().nullable().optional(),
		finishedAt: z.iso.date().nullable().optional(),
		realDuration: z.number().positive().nullable().optional(),
		score: BacklogScoreSchema.optional(),
		duration: BacklogDurationSchema.optional(),
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
