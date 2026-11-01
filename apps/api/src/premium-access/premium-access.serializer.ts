import { type PremiumGrant } from "./premium-grant.model";

export function premiumGrantSerializer(grant: PremiumGrant) {
	return {
		id: grant.id,
		userId: grant.userId,
		feature: grant.feature,
		expiresAt: grant.expiresAt?.toISOString() ?? null,
		offerCode: grant.offerCode,
		createdAt: grant.createdAt.toISOString(),
		updatedAt: grant.updatedAt.toISOString()
	};
}
