import z from "zod";

import { ManualScoreSourceCodeSchema } from "../../score-sources/score-sources.schema";

export const ReplaceGameScoresSchema = z
	.object({
		scores: z
			.array(
				z
					.object({
						source: ManualScoreSourceCodeSchema,
						score: z.number()
					})
					.strict()
			)
			.refine(
				scores =>
					new Set(scores.map(entry => entry.source)).size ===
					scores.length,
				{ message: "Sources must not be repeated" }
			)
	})
	.strict()
	.readonly();
