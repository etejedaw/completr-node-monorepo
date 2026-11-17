import { type RewindFinishedGame } from "../../../../core/models/rewind.model";

export interface TimelineGame {
	key: string;
	game: RewindFinishedGame;
	isAbandoned: boolean;
}

export interface FinishedMonth {
	month: number;
	name: string;
	count: string | null;
	abandonedCount: string | null;
	tone: string;
	games: TimelineGame[];
}
