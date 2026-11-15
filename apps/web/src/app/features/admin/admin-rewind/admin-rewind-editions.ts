import {
	ISO_DAY_LENGTH,
	ISO_MINUTE_LENGTH,
	ISO_YEAR_LENGTH
} from "../../../shared/utils/iso-date";
import {
	type CreateRewindEditionRequest,
	type RewindEdition,
	type RewindEditionSettings
} from "../services/rewind-admin.model";
import {
	type RewindEditionFormModel,
	type RewindEditionStatus
} from "./admin-rewind.model";

export const REWIND_EDITION_MIN_YEAR = 2000;
export const REWIND_EDITION_MAX_YEAR = 2100;
export const REWIND_EDITION_MAX_REGENERATIONS = 1000;
export const REWIND_DATES_TIME_ZONE_LABEL = "Dates in UTC+0";

const WHOLE_NUMBER_PATTERN = /^\d+$/;

const DEFAULT_PERIOD_OPENS = "12-01";
const DEFAULT_PERIOD_CLOSES = "01-31";
const DEFAULT_GRACE_STARTS = "01-01";
const DEFAULT_GRACE_ENDS = "01-07";

export function dateRangeLabel(start: string, end: string): string {
	return `${start} – ${end}`;
}

export function utcDateTimeLabel(isoDateTime: string): string {
	return `${isoDateTime.slice(0, ISO_MINUTE_LENGTH).replace("T", " ")} UTC`;
}

export function todayInUtc(now: Date = new Date()): string {
	return now.toISOString().slice(0, ISO_DAY_LENGTH);
}

export function rewindEditionStatus(
	edition: RewindEdition
): RewindEditionStatus {
	return edition.frozenAt ? "frozen" : edition.status;
}

export function parseWholeNumber(value: string): number | null {
	const trimmed = value.trim();
	if (!WHOLE_NUMBER_PATTERN.test(trimmed)) return null;
	return Number(trimmed);
}

export function yearError(value: string): string | null {
	const year = parseWholeNumber(value);
	if (value.trim() === "") return "Year is required.";
	if (
		year === null ||
		year < REWIND_EDITION_MIN_YEAR ||
		year > REWIND_EDITION_MAX_YEAR
	)
		return `Use a year from ${REWIND_EDITION_MIN_YEAR} to ${REWIND_EDITION_MAX_YEAR}.`;
	return null;
}

export function regenerationsError(value: string): string | null {
	if (value.trim() === "") return "Enter a number, 0 or more.";
	const count = parseWholeNumber(value);
	if (count === null) return "Use a whole number, 0 or more.";
	if (count > REWIND_EDITION_MAX_REGENERATIONS)
		return `Use at most ${REWIND_EDITION_MAX_REGENERATIONS}.`;
	return null;
}

export function periodError(opensAt: string, closesAt: string): string | null {
	if (!opensAt || !closesAt)
		return "Choose when the Rewind opens and closes.";
	if (opensAt > closesAt) return "The period must open before it closes.";
	return null;
}

export function graceError(
	model: Pick<
		RewindEditionFormModel,
		"opensAt" | "closesAt" | "graceStartsAt" | "graceEndsAt"
	>
): string | null {
	if (!model.graceStartsAt || !model.graceEndsAt)
		return "Choose the grace window.";
	if (model.graceStartsAt > model.graceEndsAt)
		return "The grace window must start before it ends.";
	if (
		(model.opensAt && model.graceStartsAt < model.opensAt) ||
		(model.closesAt && model.graceEndsAt > model.closesAt)
	)
		return "The grace window must be inside the period.";
	return null;
}

export function emptyEditionModel(
	editions: readonly RewindEdition[],
	designs: readonly string[],
	today: string = todayInUtc()
): RewindEditionFormModel {
	const latestYear = Math.max(
		Number(today.slice(0, ISO_YEAR_LENGTH)) - 1,
		...editions.map(edition => edition.year)
	);
	const year = latestYear + 1;
	return {
		year: String(year),
		opensAt: `${year}-${DEFAULT_PERIOD_OPENS}`,
		closesAt: `${year + 1}-${DEFAULT_PERIOD_CLOSES}`,
		graceStartsAt: `${year + 1}-${DEFAULT_GRACE_STARTS}`,
		graceEndsAt: `${year + 1}-${DEFAULT_GRACE_ENDS}`,
		design: designs[designs.length - 1] ?? "",
		premiumRegenerations: "0",
		giftRegenerations: "0"
	};
}

export function editionToModel(edition: RewindEdition): RewindEditionFormModel {
	return {
		year: String(edition.year),
		opensAt: edition.opensAt,
		closesAt: edition.closesAt,
		graceStartsAt: edition.graceStartsAt,
		graceEndsAt: edition.graceEndsAt,
		design: edition.design,
		premiumRegenerations: String(edition.premiumRegenerations),
		giftRegenerations: String(edition.giftRegenerations)
	};
}

export function modelToSettings(
	model: RewindEditionFormModel
): RewindEditionSettings {
	return {
		opensAt: model.opensAt,
		closesAt: model.closesAt,
		graceStartsAt: model.graceStartsAt,
		graceEndsAt: model.graceEndsAt,
		design: model.design,
		premiumRegenerations: parseWholeNumber(model.premiumRegenerations) ?? 0,
		giftRegenerations: parseWholeNumber(model.giftRegenerations) ?? 0
	};
}

export function modelToCreateRequest(
	model: RewindEditionFormModel
): CreateRewindEditionRequest {
	return {
		year: parseWholeNumber(model.year) ?? 0,
		...modelToSettings(model)
	};
}
