import z from "zod";

import { ReplaceListItemsSchema } from "../schemas/replace-list-items.schema";

export type ReplaceListItemsDto = z.infer<typeof ReplaceListItemsSchema>;
