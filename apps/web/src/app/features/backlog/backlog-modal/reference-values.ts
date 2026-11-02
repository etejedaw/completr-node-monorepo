import { type GameTime } from "../../../core/models";
import { type ReferencePick } from "./reference-values.model";

export const MAX_CRITIC_SCORE = 5;
export const MIN_REFERENCE_VALUE = 0.01;

const TWO_DECIMALS_FACTOR = 100;
const RATIO_MULTIPLIER = 20;
const MORE_THAN_TWO_DECIMALS = /\.\d{3,}$/;
const DURATION_SOURCE_PRIORITY = ["hltb", "rawg", "completr"];

export const DURATION_SOURCE_NAMES: Readonly<Record<string, string>> = {
	hltb: "HLTB",
	rawg: "RAWG",
	completr: "Completr"
};

export const NO_REFERENCE_PICK: ReferencePick = { value: null, source: "" };

export function roundToTwoDecimals(value: number): number {
	return Math.round(value * TWO_DECIMALS_FACTOR) / TWO_DECIMALS_FACTOR;
}

export function roundReferenceValue(
	value: number | null | undefined
): number | null {
	return value === null || value === undefined
		? null
		: roundToTwoDecimals(value);
}

export function toCriticScore(normalizedScore: number): number {
	return Math.min(roundToTwoDecimals(normalizedScore), MAX_CRITIC_SCORE);
}

export function estimatedRatio(
	score: number | null,
	duration: number | null
): number | null {
	if (score === null || !duration || duration <= 0) return null;
	return roundToTwoDecimals((score / duration) * RATIO_MULTIPLIER);
}

export function correctedTypedValue(
	input: HTMLInputElement,
	maxValue?: number
): number | null {
	const typed = input.valueAsNumber;
	if (input.value === "" || Number.isNaN(typed)) return null;
	if (maxValue !== undefined && typed > maxValue) return maxValue;
	if (MORE_THAN_TWO_DECIMALS.test(input.value)) {
		return roundToTwoDecimals(typed);
	}
	return null;
}

export function pickDefaultDuration(
	times: readonly GameTime[] | undefined
): ReferencePick {
	for (const source of DURATION_SOURCE_PRIORITY) {
		const found = times?.find(time => time.source === source);
		if (found) {
			return { value: roundToTwoDecimals(found.duration), source };
		}
	}
	return NO_REFERENCE_PICK;
}
