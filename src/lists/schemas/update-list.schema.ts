import z from "zod";
import { SCORE_SOURCES } from "../../score-sources/score-source.constants";
import { TIME_SOURCES } from "../../game-times/game-time.model";

export const UpdateListSchema = z
	.object({
		name: z.string().min(1).max(100).optional(),
		description: z.string().max(500).optional(),
		isPublic: z.boolean().optional(),
		scoreSource: z.enum(SCORE_SOURCES).optional(),
		durationSource: z.enum(TIME_SOURCES).optional()
	})
	.strict()
	.readonly();
