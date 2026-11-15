import z from "zod";

export const PremiumGrantParamsSchema = z
	.object({
		userId: z.uuid(),
		grantId: z.uuid()
	})
	.readonly();

export type PremiumGrantParams = z.infer<typeof PremiumGrantParamsSchema>;
