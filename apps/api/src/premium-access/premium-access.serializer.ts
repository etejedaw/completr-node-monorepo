import { type PremiumPromotionWithClaims } from "./premium-access.interface";
import { type PremiumGrant } from "./premium-grant.model";

export function premiumPromotionSerializer({
	promotion,
	claimCount
}: PremiumPromotionWithClaims) {
	return {
		id: promotion.id,
		code: promotion.code,
		feature: promotion.feature,
		startsAt: promotion.startsAt.toISOString(),
		endsAt: promotion.endsAt.toISOString(),
		claimCount,
		createdAt: promotion.createdAt.toISOString(),
		updatedAt: promotion.updatedAt.toISOString()
	};
}

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
