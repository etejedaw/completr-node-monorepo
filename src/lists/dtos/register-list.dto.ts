import z from "zod";
import { RegisterListSchema } from "../schemas/register-list.schema";

export type RegisterListDto = z.infer<typeof RegisterListSchema>;
