import z from "zod";

import { ReplaceTagsSchema } from "../schemas/replace-tags.schema";

export type ReplaceTagsDto = z.infer<typeof ReplaceTagsSchema>;
