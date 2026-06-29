import type z from "zod";

import { type RegisterGameScoreSchema } from "../schemas/register-game-score.schema";

export type RegisterGameScoreDto = z.infer<typeof RegisterGameScoreSchema>;
