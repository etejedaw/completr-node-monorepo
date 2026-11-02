import { type RewindHighlights } from "../rewind.interface";
import { type RewindHighlightsSource } from "../rewind-build.interface";
import { findBusiestMonth } from "./find-busiest-month.util";
import { findLongestStreak } from "./find-longest-streak.util";
import { pickBestRatio } from "./pick-best-ratio.util";
import { pickDurationExtremes } from "./pick-duration-extremes.util";
import { pickFinishedBookends } from "./pick-finished-bookends.util";
import { pickTopGenres } from "./pick-top-genres.util";
import { pickTopPlatforms } from "./pick-top-platforms.util";
import { pickTopRated } from "./pick-top-rated.util";

export function calculateRewindHighlights(
	source: RewindHighlightsSource
): RewindHighlights {
	const { longest, fastest } = pickDurationExtremes(source.finishedRuns);
	const topGenres = pickTopGenres(source.latestFinishedRuns, source.genres);
	const topPlatforms = pickTopPlatforms(source.finishedRuns);

	return {
		topRated: pickTopRated(source.finishedRuns),
		bestRatio: pickBestRatio(source.finishedRuns),
		longest,
		fastest,
		favoriteGenre: topGenres[0] ?? null,
		topPlatform: topPlatforms[0] ?? null,
		busiestMonth: findBusiestMonth(source.latestFinishedRuns),
		...pickFinishedBookends(source.finishedGames),
		topGenres,
		topPlatforms,
		longestStreak: findLongestStreak(source.latestFinishedRuns)
	};
}
