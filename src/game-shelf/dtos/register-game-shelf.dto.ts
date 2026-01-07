import z from "zod";
import { RegisterGameShelfSchema } from "../schemas/register-game-shelf.schema";

export type RegisterGameShelfDto = z.infer<typeof RegisterGameShelfSchema>;
