import { type RewindClosedGame } from "../../../../../core/models/rewind.model";

export interface RewindQuarterShelf {
	quarter: number;
	label: string;
	range: string;
	spokenRange: string;
	count: number;
	countLabel: string;
	games: RewindClosedGame[];
}
