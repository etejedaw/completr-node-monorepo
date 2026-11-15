import { type GamesStatusFilters } from "../games.interface";

export function buildActiveFlagWhere(
	status: GamesStatusFilters | undefined
): Record<string, unknown> {
	if (status?.onlyInactive) return { isActive: false };
	if (status?.includeInactive) return {};
	return { isActive: true };
}
