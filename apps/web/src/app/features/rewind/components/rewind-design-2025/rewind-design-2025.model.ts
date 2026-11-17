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

export interface Rewind2025FactsCopy {
	streak: (months: number) => string;
	busiestMonthTail: (count: number) => string;
	favoriteGenreTail: string;
	platformTail: (count: number) => string;
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
	platinumBadge: string;
	fastestAndBestValue: string;
	ratioUnit: string;
	facts: Rewind2025FactsCopy;
	leftBehind: string;
	leftBehindSummary: (count: number) => string;
	abandonedGameLabel: (title: string, date: string) => string;
	platinumsTitle: (count: number) => string;
	platinumGameLabel: (title: string, date: string) => string;
}
