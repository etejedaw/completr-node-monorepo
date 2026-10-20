import type z from "zod";

import { type CreateReportSchema } from "../schemas/create-report.schema";

export type CreateReportDto = z.infer<typeof CreateReportSchema>;
