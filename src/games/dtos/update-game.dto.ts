import z from "zod";

import { UpdateGameSchema } from "../schemas/update-game.schema";

export type UpdateGameDto = z.infer<typeof UpdateGameSchema>;
