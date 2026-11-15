import z from "zod";

import { PremiumGrantExpirationSchema } from "./premium-grant-expiration.schema";

export const UpdatePremiumGrantSchema = z
	.object({
		expiresAt: PremiumGrantExpirationSchema
	})
	.strict();
