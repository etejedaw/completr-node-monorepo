import { type PremiumGrantFeature } from "./premium-access.constants";

export type GiftOfferStatus =
	"available" | "active" | "used" | "expired" | "not-eligible";

export interface GiftOfferView {
	code: string;
	feature: PremiumGrantFeature;
	durationDays: number | null;
	availableFrom: string | null;
	availableUntil: string | null;
	status: GiftOfferStatus;
	expiresAt: string | null;
	canActivate: boolean;
	hasAccess: boolean;
}

export type GiftOfferExpiration =
	{ kind: "relative"; durationMs: number } | { kind: "fixed"; endsAt: Date };

export interface NormalizedGiftOffer {
	code: string;
	feature: PremiumGrantFeature;
	expiration: GiftOfferExpiration;
	availableFrom: Date | null;
	availableUntil: Date | null;
}
