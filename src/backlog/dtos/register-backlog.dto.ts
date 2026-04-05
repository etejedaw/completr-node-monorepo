import z from "zod";
import { RegisterBacklogSchema } from "../schemas/register-backlog.schema";

export type RegisterBacklogDto = z.infer<typeof RegisterBacklogSchema>;
