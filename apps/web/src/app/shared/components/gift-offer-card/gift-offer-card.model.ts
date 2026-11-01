export type GiftOfferStatus =
	"available" | "active" | "used" | "expired" | "not-eligible";

export interface GiftOffer {
	code: string;
	feature: string;
	durationDays: number;
	status: GiftOfferStatus;
	expiresAt: string | null;
	canActivate: boolean;
	hasAccess: boolean;
}

export interface GiftOfferGrant {
	id: string;
	userId: string;
	feature: string;
	expiresAt: string | null;
	offerCode: string;
	createdAt: string;
	updatedAt: string;
}

export interface GiftOfferClaim {
	grant: GiftOfferGrant;
	created: boolean;
}
