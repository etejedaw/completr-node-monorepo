import type z from "zod";

import { type LoginSchema } from "../schemas";

export type LoginDto = z.infer<typeof LoginSchema>;
