import type z from "zod";

import { type UpdateUserSchema } from "../schemas/update-user.schema";

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
