import type z from "zod";

import { type RefreshExternalDataSchema } from "../schemas/refresh-external-data.schema";

export type RefreshExternalDataDto = z.infer<typeof RefreshExternalDataSchema>;
