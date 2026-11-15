import type z from "zod";

import { type UpdateRewindEditionSchema } from "../schemas/update-rewind-edition.schema";

export type UpdateRewindEditionDto = z.infer<typeof UpdateRewindEditionSchema>;
