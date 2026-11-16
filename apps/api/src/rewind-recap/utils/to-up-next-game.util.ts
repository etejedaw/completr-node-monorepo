import {
	type RecapUpNextGame,
	type RewindQueuedGame
} from "../rewind-recap.interface";
import { daysBetween } from "./days-between.util";
import { joinRecapTags } from "./join-recap-tags.util";
import { lengthRangeOf } from "./length-range-of.util";

export function toUpNextGame(
	game: RewindQueuedGame,
	tagsByGame: Map<string, string[]>,
	todayDate: string
): RecapUpNextGame {
	return {
		title: game.title,
		genres: game.genres.length > 0 ? game.genres.join("/") : null,
		lengthRange: lengthRangeOf(game),
		estimatedHours: game.duration,
		daysWaiting: Math.max(0, daysBetween(game.addedAt, todayDate)),
		daysQueued: Math.max(0, daysBetween(game.queuedAt, todayDate)),
		tags: joinRecapTags(tagsByGame.get(game.gameId))
	};
}
