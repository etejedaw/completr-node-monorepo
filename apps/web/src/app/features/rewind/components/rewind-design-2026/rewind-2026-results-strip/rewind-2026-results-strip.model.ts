export type Rewind2026ResultsUnit = "count" | "hours" | "percent" | "rating";

export type PhoneColumns = 2 | 3;

export interface Rewind2026PhoneLayout {
	columns: PhoneColumns;
	hasLead: boolean;
}

export interface Rewind2026ResultsRow {
	label: string;
	value: number;
	unit: Rewind2026ResultsUnit;
}
