import z from "zod";

import { RegisterGameSchema } from "../schemas/register-game.schema";

export type RegisterGameDto = z.infer<typeof RegisterGameSchema>;
