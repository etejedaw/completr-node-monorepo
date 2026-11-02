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
}
