import { type NormalizedGiftOffer } from "../gift-offers.interface";

export function isGiftOfferAvailable(offer: NormalizedGiftOffer, now: Date) {
	return offer.availableFrom <= now && offer.availableUntil > now;
}
