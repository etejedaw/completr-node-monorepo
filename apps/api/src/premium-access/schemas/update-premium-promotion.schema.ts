import z from "zod";

import { PremiumPromotionDateSchema } from "./premium-promotion-date.schema";

export const UpdatePremiumPromotionSchema = z
	.object({
		startsAt: PremiumPromotionDateSchema.optional(),
		endsAt: PremiumPromotionDateSchema.optional()
	})
	.strict()
	.refine(
		value => value.startsAt !== undefined || value.endsAt !== undefined
	);
