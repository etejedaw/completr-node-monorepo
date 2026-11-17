import { type RewindTone } from "../../../rewind-tone";

export type Rewind2026ResultsUnit = "count" | "hours" | "percent" | "rating";

export interface Rewind2026ResultsRow {
	label: string;
	value: number;
	tone: RewindTone;
	unit: Rewind2026ResultsUnit;
}
