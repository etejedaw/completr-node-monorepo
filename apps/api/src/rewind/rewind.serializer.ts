import {
	type Rewind,
	type RewindClosedGame,
	type RewindPlatinumGame,
	type RewindYears,
	type RewindYearSummary
} from "./rewind.interface";

function rewindYearSummarySerializer(
	summary: RewindYearSummary
): RewindYearSummary {
	return {
		year: summary.year,
		isGenerated: summary.isGenerated,
		generationBlockedBy: summary.generationBlockedBy,
		canWriteAiRecap: summary.canWriteAiRecap,
		persona: summary.persona,
		finishedCount: summary.finishedCount,
		startedCount: summary.startedCount,
		hoursPlayed: summary.hoursPlayed,
		covers: summary.covers
	};
}

export function rewindYearsSerializer(rewindYears: RewindYears): RewindYears {
	return {
		spotlightYear: rewindYears.spotlightYear,
		period: rewindYears.period,
		years: rewindYears.years.map(rewindYearSummarySerializer),
		premiumAccess: rewindYears.premiumAccess
	};
}

function rewindClosedGameSerializer(game: RewindClosedGame): RewindClosedGame {
	return {
		gameId: game.gameId,
		code: game.code,
		title: game.title,
		coverUrl: game.coverUrl,
		backgroundUrl: game.backgroundUrl,
		finishedAt: game.finishedAt,
		platformAbbreviation: game.platformAbbreviation,
		isPlatinumRun: game.isPlatinumRun
	};
}

function rewindPlatinumGameSerializer(
	game: RewindPlatinumGame
): RewindPlatinumGame {
	return {
		gameId: game.gameId,
		code: game.code,
		title: game.title,
		coverUrl: game.coverUrl,
		backgroundUrl: game.backgroundUrl,
		platinumedAt: game.platinumedAt,
		platformAbbreviation: game.platformAbbreviation
	};
}

export function rewindSerializer(rewind: Rewind): Rewind {
	return {
		year: rewind.year,
		persona: rewind.persona,
		user: rewind.user,
		isSpotlight: rewind.isSpotlight,
		otherYears: rewind.otherYears,
		totals: rewind.totals,
		finishedGames: rewind.finishedGames.map(rewindClosedGameSerializer),
		abandonedGames: rewind.abandonedGames.map(rewindClosedGameSerializer),
		platinumGames:
			rewind.platinumGames?.map(rewindPlatinumGameSerializer) ?? null,
		highlights: rewind.highlights,
		yearMix: rewind.yearMix,
		language: rewind.language,
		generatedAt: rewind.generatedAt,
		design: rewind.design,
		frozenAt: rewind.frozenAt,
		aiRecap: rewind.aiRecap,
		premiumStats: rewind.premiumStats,
		premiumAccessKind: rewind.premiumAccessKind,
		ownerControls: rewind.ownerControls,
		premiumAccess: rewind.premiumAccess
	};
}
