import type z from "zod";

import { type ReplaceGameScoresSchema } from "../schemas/replace-game-scores.schema";

export type ReplaceGameScoresDto = z.infer<typeof ReplaceGameScoresSchema>;
