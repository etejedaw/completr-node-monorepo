import z from "zod";

import { RegisterSchema } from "../schemas";

export type RegisterDto = z.infer<typeof RegisterSchema>;
