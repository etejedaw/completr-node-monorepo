import z from "zod";

import { COMPLETR_SCORE_SOURCE } from "./score-source.constants";

export const ScoreSourceCodeSchema = z.string().trim().min(1).max(50);

export const ManualScoreSourceCodeSchema = ScoreSourceCodeSchema.refine(
	code => code !== COMPLETR_SCORE_SOURCE,
	{
		message: `"${COMPLETR_SCORE_SOURCE}" scores are computed and cannot be set manually`
	}
);

export const RegisterScoreSourceSchema = z
	.object({
		code: ScoreSourceCodeSchema,
		name: z.string().min(1).max(100),
		scale: z.number().int().positive(),
		priority: z.number().int().positive().optional()
	})
	.strict()
	.readonly();
