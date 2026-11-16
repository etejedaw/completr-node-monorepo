import { type RewindFinishedGame } from "../../../../../core/models/rewind.model";

export type Rewind2025AwardKey =
	| "firstFinished"
	| "longest"
	| "fastest"
	| "fastestAndBestValue"
	| "bestRatio"
	| "classic"
	| "lastFinished";

export interface Rewind2025Award {
	key: Rewind2025AwardKey;
	game: RewindFinishedGame;
	label: string;
	value: string;
	unit: string | null;
}

export type Rewind2025FigureKey =
	"longestStreak" | "busiestMonth" | "favoriteGenre" | "platform";

export interface Rewind2025Figure {
	key: Rewind2025FigureKey;
	label: string;
	value: string;
	spokenValue: string | null;
	unit: string | null;
	detail: string;
	spokenDetail: string | null;
}
