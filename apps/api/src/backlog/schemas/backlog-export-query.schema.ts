import type z from "zod";

import { BacklogQuerySchema } from "./backlog-query.schema";

export const BacklogExportQuerySchema = BacklogQuerySchema.unwrap()
	.omit({ limit: true, offset: true })
	.readonly();

export type BacklogExportQuery = z.infer<typeof BacklogExportQuerySchema>;
