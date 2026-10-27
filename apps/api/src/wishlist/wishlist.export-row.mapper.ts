import { type ExportRow } from "../common/interfaces/export-row.interface";
import { toIsoDateTime } from "../common/utils/to-iso-date-time.util";
import { type Wishlist } from "./wishlist.model";

export const WISHLIST_EXPORT_COLUMNS = [
	"position",
	"gameTitle",
	"platform",
	"addedAt"
] as const;

type WishlistExportRow = ExportRow<(typeof WISHLIST_EXPORT_COLUMNS)[number]>;

export function wishlistToExportRow(entry: Wishlist): WishlistExportRow {
	return {
		position: entry.position,
		gameTitle: entry.Game.title,
		platform: entry.Platform?.name ?? null,
		addedAt: toIsoDateTime(entry.createdAt)
	};
}
