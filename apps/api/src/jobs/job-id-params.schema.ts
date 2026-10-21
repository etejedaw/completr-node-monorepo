import z from "zod";

export const JobIdParamSchema = z
	.object({
		jobId: z.uuid()
	})
	.strict()
	.readonly();

export type JobIdParam = z.infer<typeof JobIdParamSchema>;
