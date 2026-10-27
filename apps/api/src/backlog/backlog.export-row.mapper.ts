import { type ExportRow } from "../common/interfaces/export-row.interface";
import { calculateRatio } from "../common/utils/calculate-ratio.util";
import { toIsoDateTime } from "../common/utils/to-iso-date-time.util";
import { type Backlog } from "./backlog.model";

export const BACKLOG_EXPORT_COLUMNS = [
	"gameTitle",
	"gameCode",
	"platform",
	"status",
	"score",
	"duration",
	"ratio",
	"realDuration",
	"personalRatio",
	"userRating",
	"startedAt",
	"finishedAt",
	"notes",
	"isPublic",
	"compilationTitle",
	"addedAt"
] as const;

type BacklogExportRow = ExportRow<(typeof BACKLOG_EXPORT_COLUMNS)[number]>;

export function backlogToExportRow(entry: Backlog): BacklogExportRow {
	return {
		gameTitle: entry.Game.title,
		gameCode: entry.Game.code,
		platform: entry.Platform.name,
		status: entry.status,
		score: entry.score ?? null,
		duration: entry.duration ?? null,
		ratio: calculateRatio(entry.score, entry.duration),
		realDuration: entry.realDuration ?? null,
		personalRatio: calculateRatio(entry.score, entry.realDuration),
		userRating: entry.userRating ?? null,
		startedAt: toIsoDateTime(entry.startedAt),
		finishedAt: toIsoDateTime(entry.finishedAt),
		notes: entry.notes ?? null,
		isPublic: entry.isPublic,
		compilationTitle: entry.CompilationGame?.title ?? null,
		addedAt: toIsoDateTime(entry.createdAt)
	};
}
