import type z from "zod";

import { type UpdateGameScoreSchema } from "../schemas/update-game-score.schema";

export type UpdateGameScoreDto = z.infer<typeof UpdateGameScoreSchema>;
