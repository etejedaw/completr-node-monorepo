export interface MonthColumn {
	month: string;
	count: number;
	heightPercent: number;
	shortLabel: string;
	fullLabel: string;
	yearLabel: string | null;
	isPeak: boolean;
	hideTickOnMobile: boolean;
	tooltipAlignClass: string;
}
