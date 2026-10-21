import type z from "zod";

import { type ReplaceGameTimesSchema } from "../schemas/replace-game-times.schema";

export type ReplaceGameTimesDto = z.infer<typeof ReplaceGameTimesSchema>;
