import type z from "zod";

import { type RefreshTokenSchema } from "../schemas/refresh-token.schema";

export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;
