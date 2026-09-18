import z from "zod";

export const CandidatesQuerySchema = z
	.object({
		userId: z.uuid()
	})
	.strict()
	.readonly();
