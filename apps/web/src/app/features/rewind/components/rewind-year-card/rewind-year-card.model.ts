export interface RewindYearCardCopy {
	finished: (count: number) => string;
	started: (count: number) => string;
	hours: (formattedHours: string) => string;
	readyToRewind: string;
	generate: string;
	rewinding: string;
	generateLabel: (year: number) => string;
	notAvailable: string;
}
