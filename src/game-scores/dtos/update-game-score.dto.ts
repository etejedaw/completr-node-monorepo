import z from "zod";

import { UpdateGameScoreSchema } from "../schemas/update-game-score.schema";

export type UpdateGameScoreDto = z.infer<typeof UpdateGameScoreSchema>;
