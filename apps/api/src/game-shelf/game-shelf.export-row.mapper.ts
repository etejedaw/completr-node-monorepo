import { type ExportRow } from "../common/types/export-row.types";
import { toIsoDateTime } from "../common/utils/to-iso-date-time.util";
import { type GameShelf } from "./game-shelf.model";

export const GAME_SHELF_EXPORT_COLUMNS = [
	"gameTitle",
	"platform",
	"edition",
	"acquiredAt",
	"notes",
	"addedAt"
] as const;

type GameShelfExportRow = ExportRow<(typeof GAME_SHELF_EXPORT_COLUMNS)[number]>;

export function gameShelfToExportRow(entry: GameShelf): GameShelfExportRow {
	return {
		gameTitle: entry.Game.title,
		platform: entry.Platform.name,
		edition: entry.edition ?? null,
		acquiredAt: toIsoDateTime(entry.acquiredAt),
		notes: entry.notes ?? null,
		addedAt: toIsoDateTime(entry.createdAt)
	};
}
