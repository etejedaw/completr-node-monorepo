import { type TimeSource } from "../game-times/game-time.model";
import { type RegisterGameDto } from "./dtos/register-game.dto";

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
	detailed?: boolean;
}

export interface SplitVariantInput {
	title: string;
	variant: string;
}

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

export interface ShowcaseGameRow {
	id: string;
	code: string;
	title: string;
	backgroundUrl: string;
	releaseYear: number | null;
	genres: string[];
	score: number | null;
	duration: number | null;
}

export interface GameScoreEntry {
	source: string;
	score: number;
}

export interface GameTimeEntry {
	source: TimeSource;
	duration: number;
}

export interface RegisterGameEnrichment {
	scores?: GameScoreEntry[];
	times?: GameTimeEntry[];
	genreSlugs?: string[];
}

export interface RawgMappedData {
	game: RegisterGameDto;
	enrichment: RegisterGameEnrichment;
}

export interface SourceValueExtractor<
	TPayload,
	TSource extends string = string
> {
	source: TSource;
	extract: (payload: TPayload) => number | null;
}

export interface ExtractedSourceValue<TSource extends string = string> {
	source: TSource;
	value: number;
}

export interface InheritedAssets {
	platformIds: string[];
	genreIds: string[];
	scores: { source: string; score: number }[];
	times: { source: TimeSource; duration: number }[];
	externals: { source: string; externalId: string }[];
}

export interface CachedShowcase {
	games: ShowcaseGameRow[];
	fetchedAt: number;
}

export interface InheritedParentAssets {
	platformIds: string[];
	genreIds: string[];
	scores: { source: string; score: number }[];
	times: { source: TimeSource; duration: number }[];
}
