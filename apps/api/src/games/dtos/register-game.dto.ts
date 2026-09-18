import type z from "zod";

import { type RegisterGameSchema } from "../schemas/register-game.schema";

export type RegisterGameDto = z.infer<typeof RegisterGameSchema>;
