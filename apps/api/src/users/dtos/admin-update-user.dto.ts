import type z from "zod";

import { type AdminUpdateUserSchema } from "../schemas/admin-update-user.schema";

export type AdminUpdateUserDto = z.infer<typeof AdminUpdateUserSchema>;
