import z from "zod";
import { SCORE_SOURCES_API } from "../game-score.model";

export const RegisterGameScoreSchema = z
	.object({
		gameId: z.uuid(),
		source: z.enum(SCORE_SOURCES_API),
		score: z.number()
	})
	.strict()
	.readonly();
