import z from "zod";

import {
	FULL_PREMIUM_FEATURE,
	PREMIUM_FEATURES
} from "../premium-access.constants";
import { PremiumPromotionDateSchema } from "./premium-promotion-date.schema";

const PROMOTION_FEATURES = [...PREMIUM_FEATURES, FULL_PREMIUM_FEATURE] as const;

// Lowercase kebab-case codes such as rewind-launch-2026.
const PROMOTION_CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CreatePremiumPromotionSchema = z
	.object({
		code: z.string().trim().min(3).max(80).regex(PROMOTION_CODE_PATTERN),
		feature: z.enum(PROMOTION_FEATURES),
		startsAt: PremiumPromotionDateSchema,
		endsAt: PremiumPromotionDateSchema
	})
	.strict();
