import { type GiftOfferStatus } from "./gift-offers.types";
import { type PremiumGrantFeature } from "./premium-access.constants";
import { type PremiumGrant } from "./premium-grant.model";

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

export interface GiftOfferState {
	offer: NormalizedGiftOffer;
	grant: PremiumGrant | null;
	hasAccess: boolean;
	evaluatedAt: Date;
}

export interface GiftOfferClaim {
	state: GiftOfferState;
	created: boolean;
}

export interface LockedGiftOfferClaim {
	offer: NormalizedGiftOffer;
	grant: PremiumGrant;
	created: boolean;
	claimedAt: Date;
}
