import { type RewindTotals } from "../../core/models/rewind.model";

export const MIN_REWIND_YEAR = 2000;
export const MAX_REWIND_YEAR = 2100;

const MONTH_NAMES = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December"
];

export function parseRewindYear(raw: string | null): number | null {
	if (!raw || !/^\d{4}$/.test(raw)) return null;
	const year = Number(raw);
	return year >= MIN_REWIND_YEAR && year <= MAX_REWIND_YEAR ? year : null;
}

export function pluralize(count: number, singular: string, plural: string) {
	return `${count} ${count === 1 ? singular : plural}`;
}

export function rewindSummarySentence(totals: RewindTotals): string {
	const parts = [
		{ count: totals.finished, verb: "finished" },
		{ count: totals.abandoned, verb: "left behind" },
		{ count: totals.started, verb: "started" }
	].filter(part => part.count > 0);
	if (parts.length === 0) return "No games this year.";
	const [lead, ...rest] = parts;
	const leadPhrase = `${pluralize(lead.count, "game", "games")} ${lead.verb}`;
	const restPhrases = rest.map(part => `${part.count} ${part.verb}`);
	return `${joinWithAnd([leadPhrase, ...restPhrases])}.`;
}

function joinWithAnd(parts: string[]): string {
	if (parts.length === 1) return parts[0];
	return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

export function monthName(month: number): string {
	return MONTH_NAMES[month - 1] ?? "";
}

export function shortMonthName(month: number): string {
	return monthName(month).slice(0, 3);
}

export function monthRange(fromMonth: number, toMonth: number): string {
	return `${shortMonthName(fromMonth)}–${shortMonthName(toMonth)}`;
}

export function spokenMonthRange(fromMonth: number, toMonth: number): string {
	return `${monthName(fromMonth)} to ${monthName(toMonth)}`;
}

export function utcMonth(isoDate: string): number {
	return new Date(isoDate).getUTCMonth() + 1;
}

export function shortDate(isoDate: string): string {
	return new Date(isoDate).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		timeZone: "UTC"
	});
}

export function formatHours(hours: number): string {
	return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

export function rewindImageFileName(username: string, year: number): string {
	return `completr-rewind-${username}-${year}.png`;
}
