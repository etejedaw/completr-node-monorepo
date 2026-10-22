import z from "zod";

import { ManualScoreSourceCodeSchema } from "../../score-sources/score-sources.schema";

export const RegisterGameScoreSchema = z
	.object({
		gameId: z.uuid(),
		source: ManualScoreSourceCodeSchema,
		score: z.number().min(0)
	})
	.strict()
	.readonly();
