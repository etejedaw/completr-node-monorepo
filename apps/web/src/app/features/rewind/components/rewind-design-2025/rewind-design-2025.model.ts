export interface RewindDesign2025Copy {
	coverOfTheYear: string;
	coverSummary: (rating: string, finishedOn: string) => string;
	quarter: (quarter: number) => string;
	gamesNoun: (count: number) => string;
	shelvesLabel: (range: string) => string;
	fastestAndBestValue: string;
	ratioUnit: string;
	favoriteGenre: string;
	platform: string;
	monthsNoun: (count: number) => string;
	runsNoun: (count: number) => string;
	thenGenres: (genres: string) => string;
	platformRuns: (count: string, platform: string) => string;
}
