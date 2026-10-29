import { type Game, type Genre, type Platform } from "../../core/models";
import { type Appendable } from "../../core/utils/http-params";

export interface GamesResponse {
	data: { games: Game[]; total: number; limit: number; offset: number };
}

export interface GamesSearchResponse {
	data: { games: Game[] };
}

export interface PlatformsResponse {
	data: { platforms: Platform[] };
}

export interface GenresResponse {
	data: { genres: Genre[] };
}

export interface RawgDetail {
	rawgId: number;
	title: string;
	description: string | null;
	coverUrl: string | null;
	releaseAt: string | null;
	platforms: string[];
	genres: string[];
	scores: { source: string; score: number }[];
	times: { source: string; duration: number }[];
}

export interface CreateGameDto {
	title: string;
	description?: string;
	platforms?: string[];
	releaseAt?: string;
	coverUrl?: string;
	backgroundUrl?: string;
	isDlc?: boolean;
	parentGameId?: string;
	variant?: string;
	genres?: string[];
	scores?: { source: string; score: number }[];
	times?: { source: string; duration: number }[];
	externalIds?: { source: string; externalId: string }[];
}

export interface UpdateGameDto {
	title?: string;
	description?: string;
	platforms?: string[];
	releaseAt?: string;
	coverUrl?: string;
	backgroundUrl?: string;
	isDlc?: boolean;
	parentGameId?: string | null;
	franchiseId?: string | null;
	variant?: string | null;
	genres?: string[];
	externalIds?: { source: string; externalId: string }[];
}

export interface SplitGameDto {
	variants: { title: string; variant: string }[];
}

export type CompilationItemInput =
	{ mode: "link"; gameId: string } | { mode: "create"; title: string };

export interface SetCompilationItemsDto {
	items: CompilationItemInput[];
}

export interface CompilationItemResponse {
	id: string;
	position: number;
	childGameId: string;
	childGame: Game | null;
}

export interface GamesQuery extends Record<string, Appendable> {
	limit?: number;
	offset?: number;
	sort_by?: string;
	sort_order?: string;
	search?: string;
	genre?: string;
	genres?: string;
	platforms?: string;
	release_year_from?: number;
	release_year_to?: number;
	min_score?: number;
	max_score?: number;
	min_duration?: number;
	max_duration?: number;
	is_dlc?: boolean;
	no_scores?: boolean;
	no_times?: boolean;
	no_platforms?: boolean;
	no_score_source?: string;
	no_time_source?: string;
	include_inactive?: boolean;
	only_inactive?: boolean;
	detailed?: boolean;
}
