import { type SavedFilter } from "./saved-filter.model";

export function savedFilterSerializer(filter: SavedFilter) {
	return {
		id: filter.id,
		name: filter.name,
		description: filter.description,
		filters: filter.filters,
		sortBy: filter.sortBy,
		sortOrder: filter.sortOrder,
		showInBacklog: filter.showInBacklog,
		isDefault: filter.isDefault,
		enabledStats: filter.enabledStats ?? null,
		createdAt: filter.createdAt
	};
}
