import z from "zod";

export const ReportIdParamsSchema = z
	.object({
		reportId: z.uuid()
	})
	.strict()
	.readonly();

export type ReportIdParams = z.infer<typeof ReportIdParamsSchema>;
