import z from "zod";

export const PremiumPromotionParamsSchema = z
	.object({ promotionId: z.uuid() })
	.readonly();

export type PremiumPromotionParams = z.infer<
	typeof PremiumPromotionParamsSchema
>;
