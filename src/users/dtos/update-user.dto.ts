import z from "zod";

import { UpdateUserSchema } from "../schemas/update-user.schema";

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
