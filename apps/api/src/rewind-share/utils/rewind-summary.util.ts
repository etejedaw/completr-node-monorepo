import { type RewindTotals } from "../../rewind/rewind.interface";

const EMPTY_YEAR_SUMMARY = "A year in games.";

function gamesNoun(count: number): string {
	return count === 1 ? "game" : "games";
}

function joinParts(parts: string[]): string {
	if (parts.length === 1) return parts[0] ?? "";
	return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

export function rewindSummary(totals: RewindTotals): string {
	const counts = [
		{ count: totals.finished, verb: "finished" },
		{ count: totals.abandoned, verb: "left behind" },
		{ count: totals.started, verb: "started" }
	].filter(({ count }) => count > 0);

	const [first] = counts;
	if (!first) return EMPTY_YEAR_SUMMARY;

	const parts = counts.map(({ count, verb }) => `${count} ${verb}`);
	parts[0] = `${first.count} ${gamesNoun(first.count)} ${first.verb}`;
	return `${joinParts(parts)}.`;
}
