import {
	type RewindFinishedGame,
	type RewindRatedGame
} from "../../../../../core/models/rewind.model";

export interface Rewind2026FanPoster {
	gameId: string;
	url: string;
	offset: number;
	size: number;
	layer: number;
}

export interface Rewind2026FanSource {
	highlights: { topRated: RewindRatedGame | null };
	finishedGames: RewindFinishedGame[];
}
