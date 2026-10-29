export interface PaginatedResult<T> {
	items: T[];
	total: number;
}

export interface GameSummary {
	id: string;
	code: string;
	title: string;
	backgroundUrl?: string;
}
