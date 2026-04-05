import z from "zod";
import { PLAYTHROUGH_STATUSES } from "../playthrough.model";

export const UpdatePlaythroughSchema = z
	.object({
		status: z.enum(PLAYTHROUGH_STATUSES).optional(),
		startedAt: z.iso.date().optional(),
		finishedAt: z.iso.date().optional(),
		realDuration: z.number().positive().optional(),
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
