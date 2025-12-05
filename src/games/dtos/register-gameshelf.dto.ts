import z from "zod";
import { RegisterGameshelfSchema } from "../schemas/register-gameshelf.schema";

export type RegisterGameshelfDto = z.infer<typeof RegisterGameshelfSchema>;
