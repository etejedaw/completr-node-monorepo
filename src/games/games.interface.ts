export interface GamesPagination {
	limit?: number;
	offset?: number;
}

export interface GamesSort {
	by?: string;
	order?: string;
}

export interface GamesRangeFilter {
	from?: number;
	to?: number;
}

export interface GamesMinMaxFilter {
	min?: number;
	max?: number;
}

export interface GamesCompilationFlags {
	isDlc?: boolean;
	isCompilation?: boolean;
	excludeCompilations?: boolean;
}

export interface GamesStatusFilters {
	includeInactive?: boolean;
	onlyInactive?: boolean;
}

export interface GamesMissingRelations {
	scores?: boolean;
	times?: boolean;
	platforms?: boolean;
}

export interface GamesExcludedSources {
	scoreSources?: readonly string[];
	timeSources?: readonly string[];
}

export interface GamesFilters {
	genres?: readonly string[];
	platforms?: readonly string[];
	releaseYear?: GamesRangeFilter;
	score?: GamesMinMaxFilter;
	duration?: GamesMinMaxFilter;
	flags?: GamesCompilationFlags;
	status?: GamesStatusFilters;
	missing?: GamesMissingRelations;
	excludedSources?: GamesExcludedSources;
}

export interface GamesQueryOptions {
	pagination?: GamesPagination;
	sort?: GamesSort;
	search?: string;
	filters?: GamesFilters;
}

export interface SplitVariantInput {
	title: string;
	variant: string;
}

export type SetCompilationItemInput =
	| { mode: "link"; gameId: string }
	| { mode: "create"; title: string };

export interface EnrichedGameList {
	id: string;
	name: string;
	description: string | null | undefined;
	isOfficial: boolean;
	ownerUsername: string | null;
	completed: boolean;
}

export interface GameListsBundle {
	lists: EnrichedGameList[];
	myLists: {
		id: string;
		name: string;
		isPublic: boolean;
		contains: boolean;
	}[];
}
