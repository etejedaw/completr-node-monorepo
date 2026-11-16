import { type GameArtOrientation, type GameArtSource } from "./game-art.model";

export function gameArtUrl(
	game: GameArtSource | null | undefined,
	orientation: GameArtOrientation
): string | null {
	if (!game) return null;
	const [preferred, fallback] =
		orientation === "portrait"
			? [game.coverUrl, game.backgroundUrl]
			: [game.backgroundUrl, game.coverUrl];
	return preferred?.trim() || fallback?.trim() || null;
}
