export type HighlightRecordKey =
	| "bestRatio"
	| "longest"
	| "fastest"
	| "firstFinished"
	| "lastFinished"
	| "classic";

export type HighlightStatKey =
	"longestStreak" | "busiestMonth" | "topGenres" | "topPlatforms";

export interface HighlightRecord {
	key: HighlightRecordKey;
	label: string;
	value: string;
	unit: string | null;
	hasLongUnit: boolean;
	code: string;
	title: string;
	artUrl: string | null;
}

export interface HighlightStat {
	key: HighlightStatKey;
	label: string;
	value: string;
	detail: string | null;
	spokenDetail: string | null;
}

export interface RankedEntry {
	name: string;
	shortName: string;
	count: number;
}

export interface HighlightRecordCell {
	record: HighlightRecord;
	cellClass: string;
	revealDelay: number;
}

export interface PlatinumCover {
	code: string;
	title: string;
	date: string;
	label: string;
	artUrl: string | null;
}

export interface PlatinumRecord {
	total: string;
	label: string;
	summary: string;
	artUrl: string | null;
	covers: PlatinumCover[];
}
