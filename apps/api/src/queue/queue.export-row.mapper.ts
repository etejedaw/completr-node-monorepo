import { type ExportRow } from "../common/interfaces/export-row.interface";
import { calculateRatio } from "../common/utils/calculate-ratio.util";
import { toIsoDateTime } from "../common/utils/to-iso-date-time.util";
import { type Queue } from "./queue.model";

export const QUEUE_EXPORT_COLUMNS = [
	"position",
	"gameTitle",
	"platform",
	"status",
	"score",
	"duration",
	"ratio",
	"addedAt"
] as const;

type QueueExportRow = ExportRow<(typeof QUEUE_EXPORT_COLUMNS)[number]>;

export function queueToExportRow(entry: Queue): QueueExportRow {
	const { Backlog: backlog } = entry;
	return {
		position: entry.position,
		gameTitle: backlog.Game.title,
		platform: backlog.Platform.name,
		status: backlog.status,
		score: backlog.score ?? null,
		duration: backlog.duration ?? null,
		ratio: calculateRatio(backlog.score, backlog.duration),
		addedAt: toIsoDateTime(entry.createdAt)
	};
}
