import { type RewindTone } from "../../../rewind-tone";

export type Rewind2025TallyUnit = "count" | "hours" | "rating";

export interface Rewind2025TallyRow {
	label: string;
	value: number;
	tone: RewindTone;
	unit: Rewind2025TallyUnit;
}
