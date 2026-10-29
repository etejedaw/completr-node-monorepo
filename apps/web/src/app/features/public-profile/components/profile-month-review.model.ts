import { type HighlightEntry } from "../services/public-reviews.model";

export type MonthHighlightKey =
	"longestPlayed" | "bestPersonalRatio" | "highestRated";

export interface MonthHighlight {
	key: MonthHighlightKey;
	label: string;
	icon: string;
	emptyIcon: string;
	labelClass: string;
	emptyText: string;
	entry: HighlightEntry | null;
	value: string | null;
}
