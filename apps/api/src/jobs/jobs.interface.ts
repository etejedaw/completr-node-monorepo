import { type Job } from "./job.model";

export interface ExternalDataSourceTally {
	updated: number;
	notFound: number;
	ambiguous: number;
	noData: number;
	failed: number;
}

export interface ExternalDataJobReport {
	candidates: number;
	processed: number;
	skippedComplete: number;
	skippedRecentlyAttempted: number;
	metacritic: ExternalDataSourceTally;
	hltb: ExternalDataSourceTally;
	igdb: ExternalDataSourceTally | null;
	hltbIdLookupPausedReason: string | null;
	hltbSkippedWithoutId: number;
}

export interface ExternalDataFailureStreaks {
	metacritic: number;
	hltb: number;
	igdb: number;
	wikidata: number;
}

export interface StartedJob {
	job: Job;
	started: boolean;
}

export interface CommunityAggregate {
	gameId: string;
	average: number;
	count: number;
}
