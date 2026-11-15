import {
	type GiftOfferState,
	type GiftOfferView
} from "./gift-offers.interface";
import { resolveGiftOfferStatus } from "./utils/resolve-gift-offer-status.util";

export function giftOfferSerializer({
	offer,
	grant,
	hasAccess,
	evaluatedAt
}: GiftOfferState): GiftOfferView {
	const status = resolveGiftOfferStatus(offer, grant, hasAccess, evaluatedAt);
	return {
		code: offer.code,
		feature: offer.feature,
		availableFrom: offer.availableFrom.toISOString(),
		availableUntil: offer.availableUntil.toISOString(),
		status,
		expiresAt: grant?.expiresAt?.toISOString() ?? null,
		canActivate: status === "available",
		hasAccess
	};
}
