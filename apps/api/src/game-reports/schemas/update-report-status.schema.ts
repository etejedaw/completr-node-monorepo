import z from "zod";

export const UpdateReportStatusSchema = z
	.object({
		status: z.enum(["approved", "rejected"])
	})
	.strict()
	.readonly();
