import type z from "zod";

import { type ReplaceFavoritesSchema } from "../schemas/replace-favorites.schema";

export type ReplaceFavoritesDto = z.infer<typeof ReplaceFavoritesSchema>;
