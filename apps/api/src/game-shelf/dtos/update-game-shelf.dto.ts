import type z from "zod";

import { type UpdateGameShelfSchema } from "../schemas/update-game-shelf.schema";

export type UpdateGameShelfDto = z.infer<typeof UpdateGameShelfSchema>;
