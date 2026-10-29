import {
	type Rewind,
	type RewindYears,
	type RewindYearSummary
} from "./rewind.interface";

function rewindYearSummarySerializer(
	summary: RewindYearSummary
): RewindYearSummary {
	return {
		year: summary.year,
		isGenerated: summary.isGenerated,
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
		years: rewindYears.years.map(rewindYearSummarySerializer)
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
		finishedGames: rewind.finishedGames,
		highlights: rewind.highlights,
		yearMix: rewind.yearMix,
		language: rewind.language,
		generatedAt: rewind.generatedAt,
		aiRecap: rewind.aiRecap,
		premiumStats: rewind.premiumStats,
		ownerControls: rewind.ownerControls
	};
}
