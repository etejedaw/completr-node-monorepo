import { type ExportRow } from "../common/types/export-row.types";
import { calculateRatio } from "../common/utils/calculate-ratio.util";
import { toIsoDateTime } from "../common/utils/to-iso-date-time.util";
import { type ListItem } from "../list-items/list-item.model";

export const LIST_EXPORT_COLUMNS = [
	"position",
	"gameTitle",
	"score",
	"duration",
	"ratio",
	"addedAt"
] as const;

type ListItemExportRow = ExportRow<(typeof LIST_EXPORT_COLUMNS)[number]>;

export function listItemToExportRow(item: ListItem): ListItemExportRow {
	return {
		position: item.position,
		gameTitle: item.Game.title,
		score: item.score ?? null,
		duration: item.duration ?? null,
		ratio: calculateRatio(item.score, item.duration),
		addedAt: toIsoDateTime(item.createdAt)
	};
}
