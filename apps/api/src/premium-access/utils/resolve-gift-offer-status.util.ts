import { type NormalizedGiftOffer } from "../gift-offers.interface";
import { type GiftOfferStatus } from "../gift-offers.types";
import { type PremiumGrant } from "../premium-grant.model";
import { isGiftOfferAvailable } from "./is-gift-offer-available.util";

export function resolveGiftOfferStatus(
	offer: NormalizedGiftOffer,
	grant: PremiumGrant | null,
	hasAccess: boolean,
	now: Date
): GiftOfferStatus {
	if (grant) {
		const grantIsActive = grant.expiresAt === null || grant.expiresAt > now;
		return grantIsActive ? "active" : "used";
	}
	if (!isGiftOfferAvailable(offer, now)) return "expired";
	return hasAccess ? "not-eligible" : "available";
}
