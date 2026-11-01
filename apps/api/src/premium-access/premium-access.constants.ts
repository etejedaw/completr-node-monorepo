import { type PremiumFeatureDefinition } from "./premium-access.interface";

export const FULL_PREMIUM_FEATURE = "*";

export const PREMIUM_FEATURES = [
	"lists.unlimited",
	"saved-filters.unlimited",
	"favorites.unlimited",
	"wishlist.unlimited",
	"queue.unlimited",
	"game-shelf.unlimited",
	"mood-tags.unlimited",
	"activity.feed-filters",
	"themes.premium",
	"export.json",
	"rewind.premium"
] as const;

export type PremiumFeature = (typeof PREMIUM_FEATURES)[number];
export type PremiumGrantFeature = PremiumFeature | typeof FULL_PREMIUM_FEATURE;

export const PREMIUM_FEATURE_DEFINITIONS: PremiumFeatureDefinition[] =
	PREMIUM_FEATURES.map(feature => ({
		feature,
		allowsExpiration: true,
		allowsGlobalGrant: true
	}));
