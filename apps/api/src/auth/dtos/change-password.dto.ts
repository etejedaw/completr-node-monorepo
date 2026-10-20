import type z from "zod";

import { type ChangePasswordSchema } from "../schemas/change-password.schema";

export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;
