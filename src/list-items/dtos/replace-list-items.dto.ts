import type z from "zod";

import { type ReplaceListItemsSchema } from "../schemas/replace-list-items.schema";

export type ReplaceListItemsDto = z.infer<typeof ReplaceListItemsSchema>;
