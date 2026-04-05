import z from "zod";
import { UpdateBacklogSchema } from "../schemas/update-backlog.schema";

export type UpdateBacklogDto = z.infer<typeof UpdateBacklogSchema>;
