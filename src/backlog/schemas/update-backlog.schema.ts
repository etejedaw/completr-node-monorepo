import z from "zod";
import { BACKLOG_STATUSES } from "../backlog.model";

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
			.refine(isMultipleOfFive, {
				message: "userRating must be in steps of 0.5"
			})
			.optional(),
		isPublic: z.boolean().optional(),
		notes: z.string().optional()
	})
	.strict()
	.readonly();

function isMultipleOfFive(input: number) {
	return (input * 10) % 5 == 0;
}
