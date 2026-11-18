import type z from "zod";

import { type ReplaceFavoriteTagsSchema } from "../schemas/replace-favorite-tags.schema";

export type ReplaceFavoriteTagsDto = z.infer<typeof ReplaceFavoriteTagsSchema>;
