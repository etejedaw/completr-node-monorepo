import z from "zod";

export const RegisterPlaythroughSchema = z
	.object({
		gameId: z.uuid(),
		platformId: z.uuid(),
		status: z
			.enum(["not_started", "playing", "completed", "abandoned"])
			.optional(),
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
