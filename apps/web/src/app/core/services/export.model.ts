import { type Appendable } from "../utils/http-params";

export type ExportCollection =
	"backlog" | "queue" | "game-shelf" | "wishlist" | "favorites" | "platinums";

export type ExportResource = ExportCollection | { listId: string };

export type ExportFormat = "csv" | "json";

export type ExportParams = Record<string, Appendable>;

export interface AttachmentOptions {
	format?: ExportFormat;
	params?: ExportParams;
}
