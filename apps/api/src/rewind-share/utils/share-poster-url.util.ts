import { type RewindGameRef } from "../../rewind/rewind.interface";

export function sharePosterUrl(
	game: Pick<RewindGameRef, "coverUrl" | "backgroundUrl">
): string | null {
	return game.coverUrl ?? game.backgroundUrl;
}
