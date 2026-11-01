import z from "zod";

import {
	FULL_PREMIUM_FEATURE,
	PREMIUM_FEATURES
} from "../premium-access.constants";

const GRANT_FEATURES = [...PREMIUM_FEATURES, FULL_PREMIUM_FEATURE] as const;
const ExpirationSchema = z.iso.datetime({ offset: true }).nullable();

export const PremiumGrantParamsSchema = z
	.object({
		userId: z.uuid(),
		grantId: z.uuid()
	})
	.readonly();

export const CreatePremiumGrantSchema = z
	.object({
		feature: z.enum(GRANT_FEATURES),
		expiresAt: ExpirationSchema
	})
	.strict();

export const UpdatePremiumGrantSchema = z
	.object({
		expiresAt: ExpirationSchema
	})
	.strict();

export type CreatePremiumGrantDto = z.infer<typeof CreatePremiumGrantSchema>;
export type UpdatePremiumGrantDto = z.infer<typeof UpdatePremiumGrantSchema>;
export type PremiumGrantParams = z.infer<typeof PremiumGrantParamsSchema>;
