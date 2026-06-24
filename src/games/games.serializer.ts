import { GameExternal } from "../game-external/game-external.model";
import { GameScore } from "../game-scores/game-score.model";
import { GameTime } from "../game-times/game-time.model";
import { Genre } from "../genres/genres.model";
import { Platform } from "../platforms/platform.model";
import { CompilationItem } from "../compilation-items/compilation-item.model";
import { Backlog } from "../backlog/backlog.model";
import { calculateRatio as calculateRatioUtil } from "../common/utils/calculate-ratio.util";
import { Game } from "./game.model";
import { EnrichedGameList } from "./games.interface";

export function gameListSerializer(
	game: Game,
	options: { justImported?: boolean } = {}
) {
	return {
		id: game.id,
		title: game.title,
		code: game.code,
		backgroundUrl: game.backgroundUrl,
		isDlc: game.isDlc,
		ratio: calculateRatio(game.GameScores, game.GameTimes),
		justImported: options.justImported ?? false,
		genres: game.Genres?.map(genreSerializer) ?? []
	};
}

export function gameSerializer(
	game: Game,
	options: { justImported?: boolean } = {}
) {
	return {
		id: game.id,
		title: game.title,
		code: game.code,
		description: game.description,
		releaseAt: game.releaseAt,
		coverUrl: game.coverUrl,
		backgroundUrl: game.backgroundUrl,
		isDlc: game.isDlc,
		parentGameId: game.parentGameId,
		variant: game.variant ?? null,
		isCompilation: game.isCompilation ?? false,
		isActive: game.isActive,
		updatedAt: game.updatedAt,
		ratio: calculateRatio(game.GameScores, game.GameTimes),
		justImported: options.justImported ?? false,
		platforms: game.Platforms?.map(platformSerializer) ?? [],
		genres: game.Genres?.map(genreSerializer) ?? [],
		scores: game.GameScores?.map(scoreSerializer) ?? [],
		times: game.GameTimes?.map(timeSerializer) ?? [],
		dlcs: game.Dlcs?.map(dlcSerializer) ?? [],
		parentGame: parentGameSerializer(game.ParentGame),
		externalLinks: game.GameExternals?.map(externalSerializer) ?? [],
		compilationItems:
			(
				game as Game & { CompilationItems?: CompilationItem[] }
			).CompilationItems?.map(compilationChildSerializer) ?? [],
		partOfCompilations:
			(
				game as Game & { PartOfCompilations?: CompilationItem[] }
			).PartOfCompilations?.map(compilationParentSerializer) ?? []
	};
}

export function compilationItemSerializer(item: CompilationItem) {
	return {
		id: item.id,
		position: item.position,
		childGameId: item.childGameId,
		childGame: item.ChildGame
			? gameSerializer(item.ChildGame.get({ plain: true }))
			: null
	};
}

export function gameListSummarySerializer(entry: EnrichedGameList) {
	return {
		id: entry.id,
		name: entry.name,
		description: entry.description ?? null,
		isOfficial: entry.isOfficial,
		owner: entry.ownerUsername ? { username: entry.ownerUsername } : null,
		completed: entry.completed
	};
}

export function gameFriendActivitySerializer(entry: Backlog) {
	return {
		username: entry.User!.username,
		name: entry.User!.name,
		avatarUrl: entry.User!.avatarUrl ?? null,
		status: entry.status,
		finishedAt: entry.finishedAt ?? null,
		userRating: entry.userRating ?? null
	};
}

export function gamePlayerSerializer(entry: Backlog) {
	return {
		username: entry.User!.username,
		name: entry.User!.name,
		avatarUrl: entry.User!.avatarUrl ?? null,
		status: entry.status
	};
}

function compilationChildSerializer(item: CompilationItem) {
	const child = item.ChildGame;
	return {
		id: item.id,
		position: item.position,
		game: child
			? {
					id: child.id,
					title: child.title,
					code: child.code,
					backgroundUrl: child.backgroundUrl,
					coverUrl: child.coverUrl
				}
			: null
	};
}

function compilationParentSerializer(item: CompilationItem) {
	const parent = item.ParentGame;
	if (!parent) return null;
	return {
		id: item.id,
		parentGame: {
			id: parent.id,
			title: parent.title,
			code: parent.code,
			backgroundUrl: parent.backgroundUrl,
			coverUrl: parent.coverUrl
		}
	};
}

function dlcSerializer(game: Game) {
	return {
		id: game.id,
		code: game.code,
		title: game.title,
		backgroundUrl: game.backgroundUrl
	};
}

function parentGameSerializer(game?: Game | null) {
	if (!game) return null;
	return {
		id: game.id,
		code: game.code,
		title: game.title,
		backgroundUrl: game.backgroundUrl
	};
}

function calculateRatio(scores?: GameScore[], times?: GameTime[]) {
	const score = scores?.find(s => s.source === "completr")?.score;
	const duration = times?.find(t => t.source === "completr")?.duration;
	return calculateRatioUtil(score, duration);
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

function externalSerializer(external: GameExternal) {
	return {
		source: external.source,
		externalId: external.externalId
	};
}
