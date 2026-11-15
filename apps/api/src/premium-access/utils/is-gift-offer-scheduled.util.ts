import { type NormalizedGiftOffer } from "../gift-offers.interface";

export function isGiftOfferScheduled(offer: NormalizedGiftOffer, now: Date) {
	return offer.availableFrom > now;
}
