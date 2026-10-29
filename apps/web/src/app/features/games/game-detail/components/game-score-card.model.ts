export interface ScoreRow {
	label: string;
	value: string;
	unit?: string;
	valueClass?: string;
	stars?: number;
}

export interface ScoreCardVariant {
	title: string;
	icon: string | null;
	description: string;
	frameClass: string;
	accentClass: string;
	rows: ScoreRow[];
}
