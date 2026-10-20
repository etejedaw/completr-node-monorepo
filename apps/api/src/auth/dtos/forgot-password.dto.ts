import type z from "zod";

import { type ForgotPasswordSchema } from "../schemas/forgot-password.schema";

export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
