import {
	type Rewind,
	type RewindFinishedGame,
	type RewindTotals
} from "../../src/rewind/rewind.interface";

export function finishedGame(
	overrides: Partial<RewindFinishedGame> = {}
): RewindFinishedGame {
	return {
		gameId: "game-1",
		code: "hades",
		title: "Hades",
		coverUrl: null,
		backgroundUrl: null,
		finishedAt: "2026-03-04T00:00:00.000Z",
		platformAbbreviation: "PC",
		...overrides
	};
}

export function buildRewind(overrides: Partial<Rewind> = {}): Rewind {
	const games = [
		finishedGame({ gameId: "game-1", code: "hades", title: "Hades" }),
		finishedGame({
			gameId: "game-2",
			code: "celeste",
			title: "Celeste",
			finishedAt: "2026-05-10T00:00:00.000Z"
		}),
		finishedGame({
			gameId: "game-3",
			code: "outer-wilds",
			title: "Outer Wilds",
			finishedAt: "2026-07-21T00:00:00.000Z"
		}),
		finishedGame({
			gameId: "game-4",
			code: "florence",
			title: "Florence",
			finishedAt: "2026-09-02T00:00:00.000Z"
		})
	];
	return {
		year: 2026,
		persona: "marathoner",
		user: {
			username: "esteban",
			name: "Esteban",
			avatarUrl: null,
			role: "user"
		},
		isSpotlight: true,
		otherYears: [2025],
		totals: {
			finished: 18,
			abandoned: 4,
			started: 23,
			hoursPlayed: 212.5,
			platinums: 3,
			finishRate: 82,
			averageRating: 4.3,
			genresPlayed: 7,
			platformsPlayed: 3
		},
		finishedGames: games,
		highlights: {
			topRated: { ...games[3]!, userRating: 5 },
			bestRatio: { ...games[1]!, personalRatio: 1.2 },
			longest: { ...games[2]!, hours: 40, isEstimate: false },
			fastest: { ...games[3]!, hours: 2, isEstimate: true },
			favoriteGenre: { code: "survival", name: "Survival", count: 7 },
			topPlatform: { name: "PC", abbreviation: "PC", count: 12 },
			busiestMonth: { month: 3, count: 5 },
			firstFinished: games[0]!,
			lastFinished: games[3]!,
			topGenres: [
				{ code: "survival", name: "Survival", count: 7 },
				{ code: "action", name: "Action", count: 5 },
				{ code: "puzzle", name: "Puzzle", count: 3 }
			],
			topPlatforms: [
				{ name: "PC", abbreviation: "PC", count: 12 },
				{ name: "PlayStation 5", abbreviation: "PS5", count: 4 }
			],
			longestStreak: { months: 5, fromMonth: 3, toMonth: 7 }
		},
		language: "en",
		generatedAt: "2026-12-02T10:00:00.000Z",
		aiRecap: null,
		premiumStats: null,
		ownerControls: null,
		...overrides
	};
}

export function emptyRewind(): Rewind {
	return buildRewind({
		persona: "steady-player",
		totals: {
			finished: 0,
			abandoned: 0,
			started: 3,
			hoursPlayed: 0,
			platinums: null,
			finishRate: null,
			averageRating: null,
			genresPlayed: 0,
			platformsPlayed: 0
		},
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
		}
	});
}

export function emptyTotals(
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
