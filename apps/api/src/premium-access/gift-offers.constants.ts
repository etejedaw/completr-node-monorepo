import {
	FULL_PREMIUM_FEATURE,
	type PremiumGrantFeature
} from "./premium-access.constants";

export interface GiftOfferDefinition {
	code: string;
	feature: PremiumGrantFeature;
	durationMs: number;
	availableFrom: string | null;
	availableUntil: string | null;
}

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export const GIFT_OFFERS: readonly GiftOfferDefinition[] = [
	{
		code: "json-export-trial-1m",
		feature: "export.json",
		durationMs: ONE_MONTH_MS,
		availableFrom: null,
		availableUntil: null
	},
	{
		code: "premium-trial-1m",
		feature: FULL_PREMIUM_FEATURE,
		durationMs: ONE_MONTH_MS,
		availableFrom: null,
		availableUntil: null
	}
];
