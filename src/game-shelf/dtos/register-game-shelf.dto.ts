import type z from "zod";

import { type RegisterGameShelfSchema } from "../schemas/register-game-shelf.schema";

export type RegisterGameShelfDto = z.infer<typeof RegisterGameShelfSchema>;
