import z from "zod";

import { UpdateTagSchema } from "../schemas/update-tag.schema";

export type UpdateTagDto = z.infer<typeof UpdateTagSchema>;
