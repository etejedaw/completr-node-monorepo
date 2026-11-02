export interface CalendarAgendaItem {
	id: string;
	title: string;
	posterSrc?: string;
	meta: string;
	dotClass: string;
	dateLabel: string;
}

export interface CalendarDayContext {
	$implicit: Date;
}
