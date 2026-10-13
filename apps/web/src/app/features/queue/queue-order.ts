import { type QueueEntry } from "../../core/models";

export type QueueSort = "manual" | "ratio" | "score" | "duration";

export type QueueStatusChange = "playing";

export const QUEUE_SORT_OPTIONS: { value: QueueSort; label: string }[] = [
	{ value: "manual", label: "My order" },
	{ value: "ratio", label: "Ratio" },
	{ value: "score", label: "Score" },
	{ value: "duration", label: "Shortest" }
];

const FEATURED_EYEBROWS: Record<QueueSort, string> = {
	manual: "Play next",
	ratio: "Best ratio",
	score: "Highest score",
	duration: "Quickest to beat"
};

export function queueFeaturedEyebrow(sort: QueueSort): string {
	return FEATURED_EYEBROWS[sort];
}

export function sortQueueEntries(
	entries: QueueEntry[],
	sort: QueueSort
): QueueEntry[] {
	if (sort === "manual") return entries;
	const sorted = [...entries];
	if (sort === "ratio") {
		sorted.sort(
			(a, b) => (b.backlog.ratio ?? -1) - (a.backlog.ratio ?? -1)
		);
	} else if (sort === "score") {
		sorted.sort(
			(a, b) => (b.backlog.score ?? -1) - (a.backlog.score ?? -1)
		);
	} else {
		sorted.sort(
			(a, b) =>
				(a.backlog.duration ?? Number.POSITIVE_INFINITY) -
				(b.backlog.duration ?? Number.POSITIVE_INFINITY)
		);
	}
	return sorted;
}
