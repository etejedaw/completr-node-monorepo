import z from "zod";
import { UpdatePlaythroughSchema } from "../schemas/update-playthrough.schema";

export type UpdatePlaythroughDto = z.infer<typeof UpdatePlaythroughSchema>;
