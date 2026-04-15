import z from "zod";

export const CreateReviewSchema = z
	.object({
		content: z.string().min(1).max(5000).optional(),
		rating: z.number().min(0.5).max(5).optional()
	})
	.refine(data => data.content || data.rating, {
		message: "At least content or rating is required"
	})
	.readonly();

export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;
