import { type RewindFinishedGame } from "../../../../../core/models/rewind.model";

export interface ClosedGame {
	key: string;
	game: RewindFinishedGame;
	isAbandoned: boolean;
	label: string;
	portraitUrl: string | null;
}

export interface ClosedMonth {
	month: number;
	name: string;
	count: string | null;
	abandonedCount: string | null;
	artUrl: string | null;
	games: ClosedGame[];
}
