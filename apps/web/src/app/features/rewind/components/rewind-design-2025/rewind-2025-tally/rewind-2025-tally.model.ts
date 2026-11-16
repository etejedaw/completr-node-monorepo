export type Rewind2025TallyUnit = "count" | "hours" | "rating";

export interface Rewind2025TallyRow {
	label: string;
	value: number;
	unit: Rewind2025TallyUnit;
}
