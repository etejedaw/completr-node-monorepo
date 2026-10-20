import z from "zod";

import { BACKLOG_STATUSES } from "../backlog.model";
import { isStepOfHalf } from "../utils/is-step-of-half.util";
import {
	BacklogDurationSchema,
	BacklogScoreSchema
} from "./backlog-reference.schema";

export const RegisterBacklogSchema = z
	.object({
		gameId: z.uuid(),
		platformId: z.uuid(),
		status: z.enum(BACKLOG_STATUSES).optional(),
		startedAt: z.iso.date().optional(),
		finishedAt: z.iso.date().optional(),
		realDuration: z.number().positive().optional(),
		score: BacklogScoreSchema,
		duration: BacklogDurationSchema,
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
