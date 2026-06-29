import type z from "zod";

import { type UpdateTagSchema } from "../schemas/update-tag.schema";

export type UpdateTagDto = z.infer<typeof UpdateTagSchema>;
