import { type PremiumAccess } from "../premium-access/premium-access.interface";
import { type UserRole } from "../users/user-role.type";
import {
	type RewindAiRecapState,
	type RewindGenerationBlocker,
	type RewindInsightKind,
	type RewindLanguage,
	type RewindLengthRange,
	type RewindPeriodStatus,
	type RewindPersonaCode,
	type RewindPremiumAccessKind,
	type RewindRegenerationBlocker
} from "./rewind.constants";

export interface RewindGameRef {
	gameId: string;
	code: string;
	title: string;
	coverUrl: string | null;
	backgroundUrl: string | null;
}

export interface RewindFinishedGame extends RewindGameRef {
	finishedAt: string;
	platformAbbreviation: string | null;
}

export interface RewindPeriod {
	status: RewindPeriodStatus;
	year: number;
	opensAt: string;
	closesAt: string;
}

export interface RewindYearSummary {
	year: number;
	isGenerated: boolean;
	generationBlockedBy: RewindGenerationBlocker | null;
	persona: RewindPersonaCode;
	finishedCount: number;
	startedCount: number;
	hoursPlayed: number;
	covers: RewindGameRef[];
}

export interface RewindYears {
	spotlightYear: number | null;
	period: RewindPeriod | null;
	years: RewindYearSummary[];
	premiumAccess: PremiumAccess | null;
}

export interface RewindTotals {
	finished: number;
	abandoned: number;
	started: number;
	hoursPlayed: number;
	platinums: number | null;
	finishRate: number | null;
	averageRating: number | null;
	genresPlayed: number;
	platformsPlayed: number;
}

export interface RewindRatedGame extends RewindFinishedGame {
	userRating: number;
}

export interface RewindRatioGame extends RewindFinishedGame {
	personalRatio: number;
}

export interface RewindDurationGame extends RewindFinishedGame {
	hours: number;
	isEstimate: boolean;
}

export interface RewindGenre {
	code: string;
	name: string;
	count: number;
}

export interface RewindPlatform {
	name: string;
	abbreviation: string;
	count: number;
}

export interface RewindMonth {
	month: number;
	count: number;
}

export interface RewindStreak {
	months: number;
	fromMonth: number;
	toMonth: number;
}

export interface RewindHighlights {
	topRated: RewindRatedGame | null;
	bestRatio: RewindRatioGame | null;
	longest: RewindDurationGame | null;
	fastest: RewindDurationGame | null;
	favoriteGenre: RewindGenre | null;
	topPlatform: RewindPlatform | null;
	busiestMonth: RewindMonth | null;
	firstFinished: RewindFinishedGame | null;
	lastFinished: RewindFinishedGame | null;
	topGenres: RewindGenre[];
	topPlatforms: RewindPlatform[];
	longestStreak: RewindStreak | null;
}

export interface RewindLengthBucket {
	range: RewindLengthRange;
	count: number;
}

export interface RewindReleaseDecade {
	decade: number;
	count: number;
}

export interface RewindYearMix {
	lengthMix: RewindLengthBucket[];
	releaseDecades: RewindReleaseDecade[];
	gamesWithoutHours: number;
	gamesWithoutRelease: number;
}

export interface RewindOwner {
	username: string;
	name: string;
	avatarUrl: string | null;
	role: UserRole;
}

export interface Rewind {
	year: number;
	persona: RewindPersonaCode;
	user: RewindOwner;
	isSpotlight: boolean;
	otherYears: number[];
	totals: RewindTotals;
	finishedGames: RewindFinishedGame[];
	highlights: RewindHighlights;
	yearMix: RewindYearMix;
	language: RewindLanguage;
	generatedAt: string;
	design: string;
	frozenAt: string | null;
	aiRecap: RewindAiRecap | null;
	premiumStats: RewindPremiumStats | null;
	premiumAccessKind: RewindPremiumAccessKind | null;
	ownerControls: RewindOwnerControls | null;
	premiumAccess: PremiumAccess | null;
}

export interface RewindViewGame extends RewindFinishedGame {
	platformName: string | null;
	genres: string[];
}

export interface RewindViewOptions {
	includesPrivateRuns: boolean;
	includesNotes: boolean;
}

export interface RewindView extends Omit<
	Rewind,
	"finishedGames" | "ownerControls" | "premiumAccess"
> {
	finishedGames: RewindViewGame[];
	personaWithoutPlatinums: RewindPersonaCode;
	covers: RewindGameRef[];
	previousYearTotals: RewindTotals | null;
	options: RewindViewOptions;
}

export interface RewindSnapshot {
	schemaVersion: 1;
	design: string;
	frozenAt: string;
	owner: RewindView;
	public: RewindView | null;
}

export interface RewindInsight {
	kind: RewindInsightKind;
	title: string;
	body: string;
}

export interface RewindAiRecap {
	headline: string;
	summary: string;
	insights: RewindInsight[];
	funFact: string;
	nextYearChallenge: string;
}

export interface RewindMonthHours {
	month: number;
	hours: number;
}

export interface RewindCriticGap extends RewindGameRef {
	userRating: number;
	criticScore: number;
	gap: number;
}

export interface RewindBacklogFlowMonth {
	month: number;
	added: number;
	finished: number;
}

export interface RewindPremiumStats {
	hoursByMonth: RewindMonthHours[];
	tasteVsCritics: RewindCriticGap[];
	backlogFlow: RewindBacklogFlowMonth[];
	genreShare: RewindGenre[];
}

export interface RewindOwnerControls {
	includesPrivateRuns: boolean;
	includesNotes: boolean;
	regenerationsLeft: number;
	graceEndsAt: string | null;
	canRegenerate: boolean;
	regenerationBlockedBy: RewindRegenerationBlocker | null;
	aiRecapState: RewindAiRecapState;
	periodOpen: boolean;
	periodStatus: RewindPeriodStatus;
	closesAt: string | null;
	frozenAt: string | null;
}

export interface GenerateRewindRequest {
	language: RewindLanguage;
	includePrivateRuns: boolean;
	includeNotes: boolean;
	expectedGeneratedAt: string | null;
}
