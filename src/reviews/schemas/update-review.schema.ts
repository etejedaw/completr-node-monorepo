import z from "zod";

export const UpdateReviewSchema = z
	.object({
		content: z.string().min(1).max(5000).nullable().optional(),
		rating: z.number().min(0.5).max(5).nullable().optional()
	})
	.readonly();

export type UpdateReviewDto = z.infer<typeof UpdateReviewSchema>;
