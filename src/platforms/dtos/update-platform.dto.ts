import type z from "zod";

import { type UpdatePlatformSchema } from "../schemas/update-platform.schema";

export type UpdatePlatformDto = z.infer<typeof UpdatePlatformSchema>;
