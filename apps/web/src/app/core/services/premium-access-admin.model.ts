export type PremiumGrantFeature =
	| "*"
	| "lists.unlimited"
	| "saved-filters.unlimited"
	| "favorites.unlimited"
	| "wishlist.unlimited"
	| "queue.unlimited"
	| "game-shelf.unlimited"
	| "mood-tags.unlimited"
	| "activity.feed-filters"
	| "themes.premium"
	| "export.json"
	| "rewind.premium";

export interface PremiumFeatureDefinition {
	feature: Exclude<PremiumGrantFeature, "*">;
	allowsExpiration: boolean;
	allowsGlobalGrant: boolean;
}

export interface PremiumGrant {
	id: string;
	userId: string;
	feature: PremiumGrantFeature;
	expiresAt: string | null;
	offerCode: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface CreatePremiumGrantRequest {
	feature: PremiumGrantFeature;
	expiresAt: string | null;
}
