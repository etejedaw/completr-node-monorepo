import z from "zod";

export const LatestReviewedQuerySchema = z
	.object({
		limit: z.coerce.number().int().min(1).max(50).default(16)
	})
	.strict()
	.readonly();

export type LatestReviewedQuery = z.infer<typeof LatestReviewedQuerySchema>;
