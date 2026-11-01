import z from "zod";

import {
	FULL_PREMIUM_FEATURE,
	PREMIUM_FEATURES
} from "../premium-access.constants";

const PROMOTION_FEATURES = [...PREMIUM_FEATURES, FULL_PREMIUM_FEATURE] as const;
const PromotionDateSchema = z.iso.datetime({ offset: true });

// Lowercase kebab-case codes such as rewind-launch-2026.
const PROMOTION_CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const PremiumPromotionParamsSchema = z
	.object({ promotionId: z.uuid() })
	.readonly();

export const CreatePremiumPromotionSchema = z
	.object({
		code: z.string().trim().min(3).max(80).regex(PROMOTION_CODE_PATTERN),
		feature: z.enum(PROMOTION_FEATURES),
		startsAt: PromotionDateSchema,
		endsAt: PromotionDateSchema
	})
	.strict();

export const UpdatePremiumPromotionSchema = z
	.object({
		startsAt: PromotionDateSchema.optional(),
		endsAt: PromotionDateSchema.optional()
	})
	.strict()
	.refine(
		value => value.startsAt !== undefined || value.endsAt !== undefined
	);

export type PremiumPromotionParams = z.infer<
	typeof PremiumPromotionParamsSchema
>;
