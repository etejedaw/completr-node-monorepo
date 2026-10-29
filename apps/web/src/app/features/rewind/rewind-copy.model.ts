import {
	type RewindInsightKind,
	type RewindLengthRange
} from "../../core/models/rewind.model";

export interface RewindSummaryCopy {
	finished: string;
	abandoned: string;
	started: string;
	game: (count: number) => string;
	participle: (verb: string, count: number) => string;
	and: string;
	empty: string;
}

export interface RewindTallyCopy {
	finished: string;
	abandoned: string;
	started: string;
	hoursPlayed: string;
	platinums: string;
	finishRate: string;
	averageRating: string;
	outOf: (value: string, scale: number) => string;
}

export interface RewindHighlightsCopy {
	topRated: string;
	ratedOutOf: (rating: number) => string;
	bestValue: string;
	bestValueHint: string;
	firstOfYear: string;
	lastOfYear: string;
	longest: string;
	fastest: string;
	hoursSuffix: (isEstimate: boolean) => string;
	longestStreak: string;
	monthsInARow: string;
	busiestMonth: string;
	gamesFinished: (count: number) => string;
	topGenres: string;
	platforms: string;
	games: (count: number) => string;
	runs: (count: number) => string;
}

export interface RewindShareCopy {
	shareImage: string;
	downloadImage: string;
	copyLink: string;
	imageFailed: string;
	tryAgain: string;
	preparingImage: string;
	shareFailed: string;
	linkCopied: string;
	copyFailed: string;
}

export interface RewindAiRecapCopy {
	heading: string;
	premiumLabel: string;
	insights: string;
	insightKinds: Record<RewindInsightKind, string>;
	funFact: string;
	nextYearChallenge: (year: number) => string;
}

export interface RewindPremiumStatsCopy {
	heading: string;
	premiumLabel: string;
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
	backlogFlow: string;
	backlogFlowHint: string;
	added: string;
	finished: string;
	netBalance: string;
	backlogGrew: (count: number) => string;
	backlogShrank: (count: number) => string;
	backlogEven: string;
	genreShare: string;
	genreShareHint: string;
	moreGenres: (count: number) => string;
	genre: string;
	games: string;
	share: string;
}

export interface RewindYearMixCopy {
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

export interface RewindPageCopy {
	ownerEyebrow: string;
	visitorEyebrow: (username: string) => string;
	ownerPreviewAlt: (year: number) => string;
	visitorPreviewAlt: (username: string, year: number) => string;
	share: string;
	year: string;
	yearHeading: string;
	results: string;
	highlights: string;
	finishedIn: (year: number) => string;
	moreRewinds: string;
	seeAll: string;
	loading: string;
	privateTitle: string;
	notAvailableTitle: string;
	notAvailableMessage: string;
	seeAllRewinds: string;
	notGeneratedTitle: string;
	notGeneratedMessage: string;
	backToProfile: string;
	generateRewind: string;
	failedTitle: string;
	failedMessage: string;
	tryAgain: string;
}

export interface RewindCopy {
	locale: string;
	page: RewindPageCopy;
	summary: RewindSummaryCopy;
	tally: RewindTallyCopy;
	highlights: RewindHighlightsCopy;
	share: RewindShareCopy;
	aiRecap: RewindAiRecapCopy;
	premiumStats: RewindPremiumStatsCopy;
	yearMix: RewindYearMixCopy;
}
