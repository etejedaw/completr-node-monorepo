import { type PremiumFeature } from "./premium-access.constants";
import { type PremiumAccessSource } from "./premium-access.types";
import { type PremiumPromotion } from "./premium-promotion.model";

export interface PremiumAccessUser {
	id: string;
	role: string;
}

export interface PremiumAccess {
	allowed: boolean;
	source: PremiumAccessSource;
	expiresAt: string | null;
}

export interface PremiumStatus {
	active: boolean;
	source: "role" | "full-grant" | null;
	expiresAt: string | null;
}

export interface PremiumFeatureDefinition {
	feature: PremiumFeature;
	allowsExpiration: boolean;
	allowsGlobalGrant: boolean;
}

export interface PremiumPromotionWithClaims {
	promotion: PremiumPromotion;
	claimCount: number;
}
