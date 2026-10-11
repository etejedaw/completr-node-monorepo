import z from "zod";

import { ManualScoreSourceCodeSchema } from "../../score-sources/score-sources.schema";

export const GameScoreIdParamsSchema = z
	.object({
		gameId: z.uuid(),
		source: ManualScoreSourceCodeSchema
	})
	.strict()
	.readonly();

export type GameScoreIdParams = z.infer<typeof GameScoreIdParamsSchema>;
