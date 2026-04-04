import z from "zod";
import { UpdateGameTimeSchema } from "../schemas/update-game-time.schema";

export type UpdateGameTimeDto = z.infer<typeof UpdateGameTimeSchema>;
