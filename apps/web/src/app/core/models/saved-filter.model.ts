export interface SavedFilter {
	id: string;
	name: string;
	description?: string;
	filters: Record<string, unknown>;
	sortBy?: string;
	sortOrder?: string;
}
