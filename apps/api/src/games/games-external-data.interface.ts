import { type ExternalDataSource } from "./games.constants";
import { type ExternalDataStatus } from "./games-external-data.types";

export interface MetacriticSourceDetail {
	slug: string;
	title: string;
	releaseYear: number | null;
	platforms: string[];
	metaScore: number | null;
	userScore: number | null;
}

export interface HltbSourceDetail {
	id: string;
	title: string;
	releaseYear: number | null;
	mainStoryHours: number | null;
	mainExtrasHours: number | null;
	completionistHours: number | null;
}

export interface MetacriticSource {
	getGameBySlug(slug: string): Promise<MetacriticSourceDetail>;
}

export interface HltbSource {
	getGameById(id: string): Promise<HltbSourceDetail>;
}

export interface HltbIdCandidate {
	hltbId: string;
	label: string | null;
	releaseYear: number | null;
	rawgSlug: string | null;
}

export interface HltbIdResolver {
	findHltbCandidates(query: {
		rawgSlug: string | null;
		title: string;
	}): Promise<HltbIdCandidate[]>;
}

export interface ExternalDataSources {
	metacritic?: MetacriticSource;
	hltb?: HltbSource;
	hltbIdResolver?: HltbIdResolver;
}

export interface ExternalDataGame {
	id: string;
	title: string;
	code?: string | null;
	variant?: string | null;
	releaseAt?: Date | string | null;
}

export interface ExternalDataResult {
	source: ExternalDataSource;
	status: ExternalDataStatus;
	score?: number;
	metaScore?: number | null;
	userScore?: number | null;
	duration?: number;
	errorCode: string | null;
}

export interface MetacriticSlugCandidate {
	slug: string;
	title: string;
}

export interface ExternalDataCandidate {
	game: ExternalDataGame;
	sources: ExternalDataSource[];
}

export interface ExternalDataCandidates {
	candidates: ExternalDataCandidate[];
	completeCount: number;
}
