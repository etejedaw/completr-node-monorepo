import z from "zod";
import { RegisterGameScoreSchema } from "../schemas/register-game-score.schema";

export type RegisterGameScoreDto = z.infer<typeof RegisterGameScoreSchema>;
