export interface PlatinumCell {
	gameId: string;
	code: string;
	title: string;
	date: string;
	label: string;
	artUrl: string | null;
}

export interface PlatinumGridLayout {
	columns: number;
	gridClass: string;
	leadClass: string;
}
