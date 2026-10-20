import type z from "zod";

import { type SplitGameSchema } from "../schemas/split-game.schema";

export type SplitGameDto = z.infer<typeof SplitGameSchema>;
