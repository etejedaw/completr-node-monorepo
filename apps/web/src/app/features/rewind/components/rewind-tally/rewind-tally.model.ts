import { type RewindTone } from "../../rewind-tone";

export type RewindTallyUnit = "count" | "hours" | "percent" | "rating";

export interface RewindTallyRow {
	label: string;
	value: number;
	tone: RewindTone;
	unit: RewindTallyUnit;
}
