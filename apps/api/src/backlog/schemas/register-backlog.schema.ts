import z from "zod";

import { BACKLOG_STATUSES, type BacklogStatus } from "../backlog.model";
import { isStepOfHalf } from "../utils/is-step-of-half.util";
import {
	BacklogDurationSchema,
	BacklogScoreSchema
} from "./backlog-reference.schema";

const REVIEWABLE_STATUSES: readonly BacklogStatus[] = [
	"completed",
	"abandoned",
	"endless"
];

const BacklogReviewSchema = z
	.object({
		content: z.string().trim().min(1).max(5000).optional(),
		rating: z.number().min(0.5).max(5).optional()
	})
	.strict()
	.refine(review => review.content || review.rating, {
		message: "At least content or rating is required"
	});

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
		compilationGameId: z.uuid().optional(),
		addToQueue: z.boolean().optional(),
		addToShelf: z.boolean().optional(),
		moodTags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
		review: BacklogReviewSchema.optional(),
		progressNote: z.string().trim().min(1).max(500).optional()
	})
	.strict()
	.refine(
		backlog =>
			!backlog.review ||
			(backlog.status !== undefined &&
				REVIEWABLE_STATUSES.includes(backlog.status)),
		{
			message:
				"review is only allowed for completed, abandoned or endless entries",
			path: ["review"]
		}
	)
	.readonly();
