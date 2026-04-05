import z from "zod";
import { UpdateListSchema } from "../schemas/update-list.schema";

export type UpdateListDto = z.infer<typeof UpdateListSchema>;
