import {
	type Rewind,
	type RewindTotals
} from "../../src/rewind/rewind.interface";
import {
	type RewindGameFranchise,
	type RewindGameGenre,
	type RewindRun
} from "../../src/rewind/rewind-run.interface";
import { type RewindRecapInput } from "../../src/rewind-recap/rewind-recap.interface";

export const RECAP_YEAR = 2026;
export const TODAY = new Date("2026-12-15T12:00:00.000Z");

export function buildTotals(
	overrides: Partial<RewindTotals> = {}
): RewindTotals {
	return {
		finished: 0,
		abandoned: 0,
		started: 0,
		hoursPlayed: 0,
		platinums: null,
		finishRate: null,
		averageRating: null,
		genresPlayed: 0,
		platformsPlayed: 0,
		...overrides
	};
}

export function buildRecapRewind(overrides: Partial<Rewind> = {}): Rewind {
	return {
		year: RECAP_YEAR,
		persona: "steady-player",
		user: {
			username: "player",
			name: "Player",
			avatarUrl: "https://img.test/avatar.png",
			role: "premium"
		},
		isSpotlight: true,
		otherYears: [],
		totals: buildTotals(),
		finishedGames: [],
		highlights: {
			topRated: null,
			bestRatio: null,
			longest: null,
			fastest: null,
			favoriteGenre: null,
			topPlatform: null,
			busiestMonth: null,
			firstFinished: null,
			lastFinished: null,
			topGenres: [],
			topPlatforms: [],
			longestStreak: null
		},
		yearMix: {
			lengthMix: [
				{ range: "under-5", count: 0 },
				{ range: "5-15", count: 0 },
				{ range: "15-30", count: 0 },
				{ range: "over-30", count: 0 }
			],
			releaseDecades: [],
			gamesWithoutHours: 0,
			gamesWithoutRelease: 0
		},
		language: "en",
		generatedAt: "2026-12-15T12:00:00.000Z",
		aiRecap: null,
		premiumStats: null,
		ownerControls: null,
		...overrides
	};
}

export function buildRecapInput(
	runs: RewindRun[],
	overrides: Partial<RewindRecapInput> = {}
): RewindRecapInput {
	return {
		year: RECAP_YEAR,
		language: "en",
		includesNotes: false,
		rewind: buildRecapRewind(),
		runs,
		genres: [],
		franchises: [],
		previousYearTotals: null,
		...overrides
	};
}

export function genreOf(
	gameCode: string,
	code: string,
	name = code
): RewindGameGenre {
	return { gameId: `id-${gameCode}`, code, name };
}

export function franchiseOf(
	gameCode: string,
	name: string
): RewindGameFranchise {
	return { gameId: `id-${gameCode}`, name };
}
