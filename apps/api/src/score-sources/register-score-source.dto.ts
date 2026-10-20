import type z from "zod";

import { type RegisterScoreSourceSchema } from "./score-sources.schema";

export type RegisterScoreSourceDto = z.infer<typeof RegisterScoreSourceSchema>;
