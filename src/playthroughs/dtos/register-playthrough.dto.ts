import z from "zod";
import { RegisterPlaythroughSchema } from "../schemas/register-playthrough.schema";

export type RegisterPlaythroughDto = z.infer<typeof RegisterPlaythroughSchema>;
