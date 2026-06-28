import z from "zod";

import { UpdatePlatformSchema } from "../schemas/update-platform.schema";

export type UpdatePlatformDto = z.infer<typeof UpdatePlatformSchema>;
