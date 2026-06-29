import type z from "zod";

import { type RegisterListSchema } from "../schemas/register-list.schema";

export type RegisterListDto = z.infer<typeof RegisterListSchema>;
