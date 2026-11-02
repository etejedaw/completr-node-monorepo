export type HighlightKey =
	| "topRated"
	| "bestRatio"
	| "firstFinished"
	| "lastFinished"
	| "longest"
	| "fastest"
	| "longestStreak"
	| "busiestMonth"
	| "topGenres"
	| "topPlatforms";

export interface HighlightCell {
	key: HighlightKey;
	columns: number;
	wideColumns: number;
	wideRows: number;
}

export interface CellView {
	classes: string;
	tone: string;
	delayMs: number;
}
