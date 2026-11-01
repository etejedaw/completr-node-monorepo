import { type GiftOffer, type GiftOfferFeature } from "./gift-offer-card.model";

const STATUS_PRIORITY: Partial<Record<GiftOffer["status"], number>> = {
	active: 0,
	available: 1
};

export function giftOfferEndsAt(offer: GiftOffer): number {
	const end =
		offer.status === "active"
			? (offer.expiresAt ?? offer.availableUntil)
			: offer.availableUntil;
	return Date.parse(end);
}

function compareOffers(a: GiftOffer, b: GiftOffer): number {
	return (
		STATUS_PRIORITY[a.status]! - STATUS_PRIORITY[b.status]! ||
		Date.parse(b.availableUntil) - Date.parse(a.availableUntil) ||
		a.code.localeCompare(b.code)
	);
}

export function selectGiftOffer(
	offers: readonly GiftOffer[],
	feature: GiftOfferFeature,
	now: number
): GiftOffer | null {
	const candidates = offers.filter(
		offer =>
			offer.feature === feature &&
			STATUS_PRIORITY[offer.status] !== undefined &&
			giftOfferEndsAt(offer) > now
	);
	return candidates.sort(compareOffers)[0] ?? null;
}
