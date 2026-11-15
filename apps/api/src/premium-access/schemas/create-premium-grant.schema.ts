import z from "zod";

import {
	FULL_PREMIUM_FEATURE,
	PREMIUM_FEATURES
} from "../premium-access.constants";
import { PremiumGrantExpirationSchema } from "./premium-grant-expiration.schema";

const GRANT_FEATURES = [...PREMIUM_FEATURES, FULL_PREMIUM_FEATURE] as const;

export const CreatePremiumGrantSchema = z
	.object({
		feature: z.enum(GRANT_FEATURES),
		expiresAt: PremiumGrantExpirationSchema
	})
	.strict();
