import { type PremiumGrantFeature } from "./premium-access.constants";

export type GiftOfferStatus =
	"available" | "active" | "used" | "expired" | "not-eligible";

export interface GiftOfferView {
	code: string;
	feature: PremiumGrantFeature;
	availableFrom: string;
	availableUntil: string;
	status: GiftOfferStatus;
	expiresAt: string | null;
	canActivate: boolean;
	hasAccess: boolean;
}

export interface NormalizedGiftOffer {
	code: string;
	feature: PremiumGrantFeature;
	availableFrom: Date;
	availableUntil: Date;
}
