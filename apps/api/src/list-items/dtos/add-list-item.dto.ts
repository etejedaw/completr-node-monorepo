import type z from "zod";

import { type AddListItemSchema } from "../schemas/add-list-item.schema";

export type AddListItemDto = z.infer<typeof AddListItemSchema>;
