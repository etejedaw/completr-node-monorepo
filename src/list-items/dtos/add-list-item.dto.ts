import z from "zod";
import { AddListItemSchema } from "../schemas/add-list-item.schema";

export type AddListItemDto = z.infer<typeof AddListItemSchema>;
