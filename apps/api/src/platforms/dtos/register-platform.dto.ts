import type z from "zod";

import { type RegisterPlatformSchema } from "../schemas/register-platform.schema";

export type RegisterPlatformDto = z.infer<typeof RegisterPlatformSchema>;
