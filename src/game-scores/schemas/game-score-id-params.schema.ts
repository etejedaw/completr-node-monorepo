import z from "zod";
import { SCORE_SOURCES_API } from "../game-score.model";

export const GameScoreIdParamsSchema = z
	.object({
		gameId: z.uuid(),
		source: z.enum(SCORE_SOURCES_API)
	})
	.strict()
	.readonly();

export type GameScoreIdParams = z.infer<typeof GameScoreIdParamsSchema>;
