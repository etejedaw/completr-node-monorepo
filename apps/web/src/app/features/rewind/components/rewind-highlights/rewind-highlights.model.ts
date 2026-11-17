export type HighlightKey =
	| "bestRatio"
	| "firstFinished"
	| "lastFinished"
	| "longest"
	| "fastest"
	| "longestStreak"
	| "busiestMonth"
	| "topGenres"
	| "topPlatforms"
	| "classic";

export interface HighlightCell {
	key: HighlightKey;
	columns: number;
	wideColumns: number;
}

export interface CellView {
	classes: string;
	tone: string;
	delayMs: number;
}
