import type z from "zod";

import { type UpdateGameTimeSchema } from "../schemas/update-game-time.schema";

export type UpdateGameTimeDto = z.infer<typeof UpdateGameTimeSchema>;
