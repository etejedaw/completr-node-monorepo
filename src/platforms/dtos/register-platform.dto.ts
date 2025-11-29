import z from "zod";
import { RegisterPlatformSchema } from "../schemas/register-platform.schema";

export type RegisterPlatformDto = z.infer<typeof RegisterPlatformSchema>;
