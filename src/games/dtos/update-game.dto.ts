import type z from "zod";

import { type UpdateGameSchema } from "../schemas/update-game.schema";

export type UpdateGameDto = z.infer<typeof UpdateGameSchema>;
