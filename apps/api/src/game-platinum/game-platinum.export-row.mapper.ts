import { type ExportRow } from "../common/types/export-row.types";
import { toIsoDateTime } from "../common/utils/to-iso-date-time.util";
import { type GamePlatinum } from "./game-platinum.model";

export const PLATINUMS_EXPORT_COLUMNS = [
	"gameTitle",
	"platform",
	"platinumedAt",
	"notes"
] as const;

type PlatinumExportRow = ExportRow<(typeof PLATINUMS_EXPORT_COLUMNS)[number]>;

export function platinumToExportRow(platinum: GamePlatinum): PlatinumExportRow {
	return {
		gameTitle: platinum.Game?.title ?? null,
		platform: platinum.Platform?.name ?? null,
		platinumedAt: toIsoDateTime(platinum.platinumedAt),
		notes: platinum.notes
	};
}
