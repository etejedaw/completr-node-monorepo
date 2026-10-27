import { type ExportRow } from "../common/interfaces/export-row.interface";
import { toIsoDateTime } from "../common/utils/to-iso-date-time.util";
import { type Favorite } from "./favorite.model";

export const FAVORITES_EXPORT_COLUMNS = [
	"position",
	"gameTitle",
	"gameCode",
	"addedAt"
] as const;

type FavoriteExportRow = ExportRow<(typeof FAVORITES_EXPORT_COLUMNS)[number]>;

export function favoriteToExportRow(entry: Favorite): FavoriteExportRow {
	return {
		position: entry.position,
		gameTitle: entry.Game.title,
		gameCode: entry.Game.code,
		addedAt: toIsoDateTime(entry.createdAt)
	};
}
