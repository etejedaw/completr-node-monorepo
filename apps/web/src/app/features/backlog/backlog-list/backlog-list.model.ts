import { type SortOrder } from "../components/backlog-filters-panel/backlog-filters-panel";

export interface ClearAction {
	label: string;
	description: string;
	icon: string;
}

export interface ViewSnapshot {
	filters: Record<string, string>;
	sortBy: string;
	sortOrder: SortOrder;
}
