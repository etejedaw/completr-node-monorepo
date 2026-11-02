import z from "zod";

export const GiftOfferParamsSchema = z
	.object({
		offerCode: z
			.string()
			.regex(/^[a-z0-9-]+$/)
			.max(80)
	})
	.readonly();

export const ClaimGiftOfferSchema = z.object({}).strict();

export type GiftOfferParams = z.infer<typeof GiftOfferParamsSchema>;
