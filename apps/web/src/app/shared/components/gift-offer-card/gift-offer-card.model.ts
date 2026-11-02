import { type PremiumFeature } from "../../../core/models";

export type GiftOfferStatus =
	"available" | "active" | "used" | "expired" | "not-eligible";

export type GiftOfferFeature = PremiumFeature | "*";

export interface GiftOffer {
	code: string;
	feature: GiftOfferFeature;
	availableFrom: string;
	availableUntil: string;
	status: GiftOfferStatus;
	expiresAt: string | null;
	canActivate: boolean;
	hasAccess: boolean;
}

export interface GiftOfferClaim {
	offer: GiftOffer;
	created: boolean;
}

export interface GiftOfferCopy {
	title: string;
	shortTitle: string;
	description: string;
}
