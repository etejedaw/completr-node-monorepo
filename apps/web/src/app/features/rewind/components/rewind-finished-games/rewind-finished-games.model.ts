import { type RewindFinishedGame } from "../../../../core/models/rewind.model";

export interface FinishedMonth {
	month: number;
	name: string;
	count: string;
	tone: string;
	games: RewindFinishedGame[];
}
