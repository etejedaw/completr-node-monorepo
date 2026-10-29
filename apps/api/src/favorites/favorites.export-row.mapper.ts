import { type ExportRow } from "../common/types/export-row.types";
import { toIsoDateTime } from "../common/utils/to-iso-date-time.util";
import { type Favorite } from "./favorite.model";

export const FAVORITES_EXPORT_COLUMNS = [
	"position",
	"gameTitle",
	"addedAt"
] as const;

type FavoriteExportRow = ExportRow<(typeof FAVORITES_EXPORT_COLUMNS)[number]>;

export function favoriteToExportRow(entry: Favorite): FavoriteExportRow {
	return {
		position: entry.position,
		gameTitle: entry.Game.title,
		addedAt: toIsoDateTime(entry.createdAt)
	};
}
