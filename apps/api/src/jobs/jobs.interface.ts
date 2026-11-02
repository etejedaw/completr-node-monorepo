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
	metacritic: ExternalDataSourceTally;
	hltb: ExternalDataSourceTally;
	hltbIdLookupPausedReason: string | null;
	hltbSkippedWithoutId: number;
}

export interface ExternalDataFailureStreaks {
	metacritic: number;
	hltb: number;
	wikidata: number;
}
