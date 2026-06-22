export interface GamesQueryOptions {
	limit?: number;
	offset?: number;
	sort_by?: string;
	sort_order?: string;
	search?: string;
	genre?: string;
	genres?: readonly string[];
	platforms?: readonly string[];
	release_year_from?: number;
	release_year_to?: number;
	min_score?: number;
	max_score?: number;
	min_duration?: number;
	max_duration?: number;
	is_dlc?: boolean;
	is_compilation?: boolean;
	exclude_compilations?: boolean;
	include_inactive?: boolean;
	only_inactive?: boolean;
	no_scores?: boolean;
	no_times?: boolean;
	no_platforms?: boolean;
	no_score_source?: readonly string[];
	no_time_source?: readonly string[];
}

export interface SplitVariantInput {
	title: string;
	variant: string;
}

export type SetCompilationItemInput =
	| { mode: "link"; gameId: string }
	| { mode: "create"; title: string };
