import {
	type RewindLengthRange,
	type RewindPremiumAccessKind
} from "../../../../core/models/rewind.model";

export interface Rewind2025TallyCopy {
	finished: string;
	abandoned: string;
	hoursPlayed: string;
	averageRating: string;
	outOf: (value: string, scale: number) => string;
}

export interface Rewind2025PremiumStatsCopy {
	heading: string;
	premiumLabels: Record<RewindPremiumAccessKind, string>;
	hoursByMonth: string;
	hoursByMonthHint: string;
	hours: string;
	month: string;
	tasteVsCritics: string;
	tasteVsCriticsHint: string;
	game: string;
	yourRating: string;
	critics: string;
	gap: string;
	likedMore: string;
	likedLess: string;
	agreed: string;
	genreShare: string;
	genreShareHint: string;
	moreGenres: (count: number) => string;
	genre: string;
	games: string;
	share: string;
}

export interface Rewind2025YearMixCopy {
	heading: string;
	gameLength: string;
	gameLengthHint: string;
	lengthRanges: Record<RewindLengthRange, string>;
	length: string;
	withoutHours: (count: string) => string;
	releaseDecades: string;
	releaseDecadesHint: string;
	decade: string;
	decadeLabel: (decade: number) => string;
	topDecade: (label: string) => string;
	withoutRelease: (count: string) => string;
	games: string;
	share: string;
}

export interface RewindDesign2025Copy {
	locale: string;
	tally: Rewind2025TallyCopy;
	premiumStats: Rewind2025PremiumStatsCopy;
	yearMix: Rewind2025YearMixCopy;
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
	leftBehind: string;
	leftBehindSummary: (count: number) => string;
	abandonedGameLabel: (title: string, date: string) => string;
}
