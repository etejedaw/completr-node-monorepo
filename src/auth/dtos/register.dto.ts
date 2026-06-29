import type z from "zod";

import { type RegisterSchema } from "../schemas";

export type RegisterDto = z.infer<typeof RegisterSchema>;
