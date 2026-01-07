import z from "zod";
import { UpdateGameShelfSchema } from "../schemas/update-game-shelf.schema";

export type UpdateGameShelfDto = z.infer<typeof UpdateGameShelfSchema>;
