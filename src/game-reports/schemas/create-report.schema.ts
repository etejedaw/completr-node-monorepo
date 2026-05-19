import z from "zod";
import { REPORT_CATEGORIES } from "../game-report.model";

export const CreateReportSchema = z
	.object({
		message: z.string().min(10).max(1000),
		category: z.enum(REPORT_CATEGORIES).optional().default("general")
	})
	.strict()
	.readonly();

export type CreateReportBody = z.infer<typeof CreateReportSchema>;
