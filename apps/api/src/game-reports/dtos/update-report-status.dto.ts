import type z from "zod";

import { type UpdateReportStatusSchema } from "../schemas/update-report-status.schema";

export type UpdateReportStatusDto = z.infer<typeof UpdateReportStatusSchema>;
