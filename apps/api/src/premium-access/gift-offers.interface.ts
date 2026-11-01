import { type PremiumGrantFeature } from "./premium-access.constants";

export type GiftOfferStatus =
	"available" | "active" | "used" | "expired" | "not-eligible";

export interface GiftOfferView {
	code: string;
	feature: PremiumGrantFeature;
	durationDays: number;
	status: GiftOfferStatus;
	expiresAt: string | null;
	canActivate: boolean;
	hasAccess: boolean;
}
