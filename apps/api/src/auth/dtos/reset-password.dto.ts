import type z from "zod";

import { type ResetPasswordSchema } from "../schemas/reset-password.schema";

export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
