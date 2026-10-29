import { type StatKey } from "../../saved-filters";
import { type BacklogHighlight } from "../../saved-filters.model";

export type HighlightStatKey =
	"longestPlayed" | "bestPersonalRatio" | "highestRated";

export interface SummaryTile {
	key: StatKey;
	label: string;
	value: string;
	valueClass: string;
	hint: string | null;
}

export interface HighlightDescriptor {
	key: HighlightStatKey;
	label: string;
	icon: string;
	iconClass: string;
	formattedValue: string;
	entry: BacklogHighlight;
}

export interface DurationBar {
	label: string;
	value: number;
	percent: number;
	fillClass: string;
}

export interface DeltaDescriptor {
	text: string;
	icon: string;
	toneClass: string;
	caption: string;
}
