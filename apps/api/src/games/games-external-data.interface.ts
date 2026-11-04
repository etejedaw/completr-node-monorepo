import { type ExternalDataAttemptStatus } from "../external-data-attempts/external-data-attempt.model";
import { type IgdbGame, type IgdbSearchOptions } from "../igdb/igdb.interface";
import { type ExternalDataSource } from "./games.constants";
import {
	type ExternalDataRequestPriority,
	type ExternalDataStatus
} from "./games-external-data.types";

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

export interface ExternalDataRequestOptions {
	priority?: ExternalDataRequestPriority;
	signal?: AbortSignal;
}

export interface ExternalDataRefreshOptions extends ExternalDataRequestOptions {
	resolveHltbId?: boolean;
}

export interface MetacriticSource {
	getGameBySlug(
		slug: string,
		options?: ExternalDataRequestOptions
	): Promise<MetacriticSourceDetail>;
}

export interface HltbSource {
	getGameById(
		id: string,
		options?: ExternalDataRequestOptions
	): Promise<HltbSourceDetail>;
}

export interface IgdbSource {
	getGameById(id: number): Promise<IgdbGame>;
	getGameBySlug(slug: string): Promise<IgdbGame>;
	searchGame(query: string, options?: IgdbSearchOptions): Promise<IgdbGame[]>;
}

export interface RequestPacerClock {
	now(): number;
	sleep(milliseconds: number, signal?: AbortSignal): Promise<void>;
}

export interface ExternalDataRequestPacer {
	waitForTurn(signal?: AbortSignal): Promise<void>;
}

export interface HltbIdCandidate {
	hltbId: string;
	label: string | null;
	releaseYear: number | null;
	rawgSlug: string | null;
}

export interface HltbIdResolver {
	findHltbCandidates(
		query: {
			rawgSlug: string | null;
			title: string;
		},
		options?: ExternalDataRequestOptions
	): Promise<HltbIdCandidate[]>;
}

export interface ExternalDataSources {
	metacritic?: MetacriticSource;
	hltb?: HltbSource;
	hltbIdResolver?: HltbIdResolver;
	igdb?: IgdbSource;
}

export interface ExternalDataRefreshTimer {
	deadlineMs: number;
	startTimer(milliseconds: number, onExpire: () => void): () => void;
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
	httpStatus?: number;
	retryAfterSeconds?: number;
}

export interface MetacriticSlugCandidate {
	slug: string;
	title: string;
}

export interface ExternalDataCandidate {
	game: ExternalDataGame;
	sources: ExternalDataSource[];
}

export interface ExternalDataPendingCandidate extends ExternalDataCandidate {
	oldestAttemptedAt: number;
}

export interface ExternalDataCandidates {
	candidates: ExternalDataCandidate[];
	completeCount: number;
	recentlyAttemptedCount: number;
}

export interface ExternalDataAttemptRecord {
	gameId: string;
	source: ExternalDataSource;
	status: ExternalDataAttemptStatus;
	attemptedAt: Date;
}
