export type GiftOfferStatus =
	"available" | "active" | "used" | "expired" | "not-eligible";

export interface GiftOffer {
	code: string;
	feature: string;
	durationDays: number | null;
	availableFrom: string | null;
	availableUntil: string | null;
	status: GiftOfferStatus;
	expiresAt: string | null;
	canActivate: boolean;
	hasAccess: boolean;
}

export interface GiftOfferClaim {
	offer: GiftOffer;
	created: boolean;
}
