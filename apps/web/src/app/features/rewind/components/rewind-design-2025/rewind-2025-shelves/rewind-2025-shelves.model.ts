import { type RewindFinishedGame } from "../../../../../core/models/rewind.model";

export interface RewindQuarterShelf {
	quarter: number;
	label: string;
	range: string;
	spokenRange: string;
	count: number;
	countLabel: string;
	games: RewindFinishedGame[];
}
