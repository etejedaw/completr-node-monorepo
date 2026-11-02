import { calculateRatio } from "../common/utils/calculate-ratio.util";
import { type Queue } from "./queue.model";
import { type QueueEntryComparator } from "./queue.types";
import { type QueueExportQuery } from "./schemas/queue-export-query.schema";

function ratioOf(entry: Queue) {
	return calculateRatio(entry.Backlog.score, entry.Backlog.duration);
}

const COMPARATORS: Record<
	Exclude<QueueExportQuery["sort"], "manual">,
	QueueEntryComparator
> = {
	ratio: (a, b) => (ratioOf(b) ?? -1) - (ratioOf(a) ?? -1),
	score: (a, b) => (b.Backlog.score ?? -1) - (a.Backlog.score ?? -1),
	duration: (a, b) =>
		(a.Backlog.duration ?? Number.POSITIVE_INFINITY) -
		(b.Backlog.duration ?? Number.POSITIVE_INFINITY)
};

export function sortQueueExport(
	entries: Queue[],
	sort: QueueExportQuery["sort"]
) {
	if (sort === "manual") return entries;
	return entries.toSorted(COMPARATORS[sort]);
}
