export interface RewindYearCardCopy {
	finished: (count: number) => string;
	started: (count: number) => string;
	readyToRewind: string;
	generate: string;
	rewinding: string;
	generateLabel: (year: number) => string;
}
