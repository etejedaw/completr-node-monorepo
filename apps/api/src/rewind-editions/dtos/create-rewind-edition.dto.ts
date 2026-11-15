import type z from "zod";

import { type CreateRewindEditionSchema } from "../schemas/create-rewind-edition.schema";

export type CreateRewindEditionDto = z.infer<typeof CreateRewindEditionSchema>;
