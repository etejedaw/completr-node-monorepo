import z from "zod";
import { UpdateListItemSchema } from "../schemas/update-list-item.schema";

export type UpdateListItemDto = z.infer<typeof UpdateListItemSchema>;
