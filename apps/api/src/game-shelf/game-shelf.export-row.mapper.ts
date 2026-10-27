import { type ExportRow } from "../common/interfaces/export-row.interface";
import { toIsoDateTime } from "../common/utils/to-iso-date-time.util";
import { type GameShelf } from "./game-shelf.model";

export const GAME_SHELF_EXPORT_COLUMNS = [
	"gameTitle",
	"gameCode",
	"platform",
	"edition",
	"acquiredAt",
	"notes",
	"isPublic",
	"addedAt"
] as const;

type GameShelfExportRow = ExportRow<(typeof GAME_SHELF_EXPORT_COLUMNS)[number]>;

export function gameShelfToExportRow(entry: GameShelf): GameShelfExportRow {
	return {
		gameTitle: entry.Game.title,
		gameCode: entry.Game.code,
		platform: entry.Platform.name,
		edition: entry.edition ?? null,
		acquiredAt: toIsoDateTime(entry.acquiredAt),
		notes: entry.notes ?? null,
		isPublic: entry.isPublic,
		addedAt: toIsoDateTime(entry.createdAt)
	};
}
