import { GameScore } from "../game-scores/game-score.model";
import { GameTime } from "../game-times/game-time.model";
import { Genre } from "../genres/genres.model";
import { Platform } from "../platforms/platform.model";
import { Game } from "./game.model";

export function gameSerializer(game: Game) {
	return {
		id: game.id,
		title: game.title,
		code: game.code,
		description: game.description,
		releaseAt: game.releaseAt,
		coverUrl: game.coverUrl,
		isDlc: game.isDlc,
		parentGameId: game.parentGameId,
		updatedAt: game.updatedAt,
		ratio: calculateRatio(game.GameScores, game.GameTimes),
		platforms: game.Platforms?.map(platformSerializer) ?? [],
		genres: game.Genres?.map(genreSerializer) ?? [],
		scores: game.GameScores?.map(scoreSerializer) ?? [],
		times: game.GameTimes?.map(timeSerializer) ?? []
	};
}

function calculateRatio(scores?: GameScore[], times?: GameTime[]) {
	const score = scores?.find(s => s.source === "completr")?.score;
	const duration = times?.find(t => t.source === "completr")?.duration;
	if (!score || !duration) return undefined;
	return Math.round((score / duration) * 100) / 100;
}

function platformSerializer(platform: Platform) {
	return {
		id: platform.id,
		name: platform.name,
		code: platform.code,
		abbreviation: platform.abbreviation
	};
}

function genreSerializer(genre: Genre) {
	return {
		id: genre.id,
		name: genre.name,
		code: genre.code
	};
}

function scoreSerializer(gameScore: GameScore) {
	return {
		source: gameScore.source,
		score: gameScore.score
	};
}

function timeSerializer(gameTime: GameTime) {
	return {
		source: gameTime.source,
		duration: gameTime.duration
	};
}
