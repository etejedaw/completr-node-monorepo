import type z from "zod";

import { type BulkFavoritesSchema } from "../schemas/bulk-favorites.schema";

export type BulkFavoritesDto = z.infer<typeof BulkFavoritesSchema>;
