import type z from "zod";

import { type RegisterGameTimeSchema } from "../schemas/register-game-time.schema";

export type RegisterGameTimeDto = z.infer<typeof RegisterGameTimeSchema>;
