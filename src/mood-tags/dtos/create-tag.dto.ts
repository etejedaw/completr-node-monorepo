import type z from "zod";

import { type CreateTagSchema } from "../schemas/create-tag.schema";

export type CreateTagDto = z.infer<typeof CreateTagSchema>;
