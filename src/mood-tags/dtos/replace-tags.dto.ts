import type z from "zod";

import { type ReplaceTagsSchema } from "../schemas/replace-tags.schema";

export type ReplaceTagsDto = z.infer<typeof ReplaceTagsSchema>;
