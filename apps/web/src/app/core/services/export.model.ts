export type ExportCollection =
	"backlog" | "queue" | "game-shelf" | "wishlist" | "favorites" | "platinums";

export type ExportResource = ExportCollection | { listId: string };
