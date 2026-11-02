import { type PremiumGrantFeature } from "./premium-access-admin.model";

export interface PremiumPromotion {
	id: string;
	code: string;
	feature: PremiumGrantFeature;
	startsAt: string;
	endsAt: string;
	claimCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface CreatePremiumPromotionRequest {
	code: string;
	feature: PremiumGrantFeature;
	startsAt: string;
	endsAt: string;
}

export interface UpdatePremiumPromotionRequest {
	startsAt?: string;
	endsAt?: string;
}

export type PremiumPromotionStatus = "scheduled" | "active" | "ended";

export interface PremiumPromotionFeatureOption {
	feature: PremiumGrantFeature;
	label: string;
}

export const PREMIUM_PROMOTION_FEATURE_OPTIONS: PremiumPromotionFeatureOption[] =
	[
		{ feature: "*", label: "Full premium" },
		{ feature: "lists.unlimited", label: "Unlimited lists" },
		{
			feature: "saved-filters.unlimited",
			label: "Unlimited saved filters"
		},
		{ feature: "favorites.unlimited", label: "Unlimited favorites" },
		{ feature: "wishlist.unlimited", label: "Unlimited wishlist" },
		{ feature: "queue.unlimited", label: "Unlimited queue" },
		{ feature: "game-shelf.unlimited", label: "Unlimited game shelf" },
		{ feature: "mood-tags.unlimited", label: "Unlimited mood tags" },
		{ feature: "activity.feed-filters", label: "Activity feed filters" },
		{ feature: "themes.premium", label: "Premium themes" },
		{ feature: "export.json", label: "JSON export" },
		{ feature: "rewind.premium", label: "Premium Rewind" }
	];

export function premiumPromotionStatus(
	promotion: Pick<PremiumPromotion, "startsAt" | "endsAt">,
	now = new Date()
): PremiumPromotionStatus {
	if (now >= new Date(promotion.endsAt)) return "ended";
	if (now < new Date(promotion.startsAt)) return "scheduled";
	return "active";
}
