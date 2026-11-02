import type z from "zod";

import { type GenerateRewindSchema } from "./schemas/generate-rewind.schema";

export type GenerateRewindDto = z.infer<typeof GenerateRewindSchema>;
