import z from "zod";

export const RewindYearParamsSchema = z
	.object({
		username: z.string(),
		year: z.coerce.number().int().min(2000).max(2100)
	})
	.strict()
	.readonly();

export type RewindYearParams = z.infer<typeof RewindYearParamsSchema>;
