import { type ExportRow } from "../common/interfaces/export-row.interface";
import { toIsoDateTime } from "../common/utils/to-iso-date-time.util";
import { type GamePlatinum } from "./game-platinum.model";

export const PLATINUMS_EXPORT_COLUMNS = [
	"gameTitle",
	"gameCode",
	"platform",
	"platinumedAt",
	"notes"
] as const;

type PlatinumExportRow = ExportRow<(typeof PLATINUMS_EXPORT_COLUMNS)[number]>;

export function platinumToExportRow(platinum: GamePlatinum): PlatinumExportRow {
	return {
		gameTitle: platinum.Game?.title ?? null,
		gameCode: platinum.Game?.code ?? null,
		platform: platinum.Platform?.name ?? null,
		platinumedAt: toIsoDateTime(platinum.platinumedAt),
		notes: platinum.notes
	};
}
