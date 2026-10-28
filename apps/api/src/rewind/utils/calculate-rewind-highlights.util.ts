import { type RewindHighlights } from "../rewind.interface";
import {
	type ClosedRewindRun,
	type RewindGameGenre
} from "../rewind-run.interface";
import { findBusiestMonth } from "./find-busiest-month.util";
import { findFavoriteGenre } from "./find-favorite-genre.util";
import { findTopPlatform } from "./find-top-platform.util";
import { pickBestRatio } from "./pick-best-ratio.util";
import { pickDurationExtremes } from "./pick-duration-extremes.util";
import { pickTopRated } from "./pick-top-rated.util";

export interface RewindHighlightsSource {
	finishedRuns: ClosedRewindRun[];
	latestFinishedRuns: ClosedRewindRun[];
	genres: RewindGameGenre[];
}

export function calculateRewindHighlights(
	source: RewindHighlightsSource
): RewindHighlights {
	const { longest, fastest } = pickDurationExtremes(source.finishedRuns);

	return {
		topRated: pickTopRated(source.finishedRuns),
		bestRatio: pickBestRatio(source.finishedRuns),
		longest,
		fastest,
		favoriteGenre: findFavoriteGenre(
			source.latestFinishedRuns,
			source.genres
		),
		topPlatform: findTopPlatform(source.finishedRuns),
		busiestMonth: findBusiestMonth(source.latestFinishedRuns)
	};
}
