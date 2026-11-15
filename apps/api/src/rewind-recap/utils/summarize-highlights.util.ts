import { type RewindHighlights } from "../../rewind/rewind.interface";
import { summarizeDurationGame } from "./summarize-duration-game.util";
import { summarizeFinishedGame } from "./summarize-finished-game.util";
import { summarizeGenre } from "./summarize-genre.util";
import { summarizePlatform } from "./summarize-platform.util";

export function summarizeHighlights(highlights: RewindHighlights) {
	const { topRated, bestRatio, favoriteGenre, topPlatform } = highlights;
	return {
		topRated: topRated && {
			title: topRated.title,
			userRating: topRated.userRating
		},
		bestRatio: bestRatio && {
			title: bestRatio.title,
			personalRatio: bestRatio.personalRatio
		},
		longest: summarizeDurationGame(highlights.longest),
		fastest: summarizeDurationGame(highlights.fastest),
		favoriteGenre: favoriteGenre && summarizeGenre(favoriteGenre),
		topPlatform: topPlatform && summarizePlatform(topPlatform),
		busiestMonth: highlights.busiestMonth,
		firstFinished: summarizeFinishedGame(highlights.firstFinished),
		lastFinished: summarizeFinishedGame(highlights.lastFinished),
		topGenres: highlights.topGenres.map(summarizeGenre),
		topPlatforms: highlights.topPlatforms.map(summarizePlatform),
		longestStreak: highlights.longestStreak
	};
}
