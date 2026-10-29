import { type RewindFinishedGame } from "../../../../core/models/rewind.model";

export interface FinishedMonth {
	month: number;
	name: string;
	games: RewindFinishedGame[];
}
