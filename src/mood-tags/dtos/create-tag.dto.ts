import z from "zod";
import { CreateTagSchema } from "../schemas/create-tag.schema";

export type CreateTagDto = z.infer<typeof CreateTagSchema>;
