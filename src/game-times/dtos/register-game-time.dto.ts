import z from "zod";
import { RegisterGameTimeSchema } from "../schemas/register-game-time.schema";

export type RegisterGameTimeDto = z.infer<typeof RegisterGameTimeSchema>;
