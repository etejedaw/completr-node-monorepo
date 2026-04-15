import z from "zod";

export const UpdateReportStatusSchema = z
	.object({
		status: z.enum(["approved", "rejected"])
	})
	.strict()
	.readonly();

export type UpdateReportStatusBody = z.infer<typeof UpdateReportStatusSchema>;
