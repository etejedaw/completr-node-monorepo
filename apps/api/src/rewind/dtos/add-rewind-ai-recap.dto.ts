import type z from "zod";

import { type AddRewindAiRecapSchema } from "../schemas/add-rewind-ai-recap.schema";

export type AddRewindAiRecapDto = z.infer<typeof AddRewindAiRecapSchema>;
