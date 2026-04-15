import z from "zod";

export const CreateReportSchema = z
	.object({
		message: z.string().min(10).max(1000)
	})
	.strict()
	.readonly();

export type CreateReportBody = z.infer<typeof CreateReportSchema>;
