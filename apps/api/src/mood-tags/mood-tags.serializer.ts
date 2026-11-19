import { gameRatioSummarySerializer } from "../games/games.serializer";
import { type MoodTagMeta } from "./mood-tag-meta.model";
import {
	type CommunityTagStatsRow,
	type GameCommunityTagRow,
	type TaggedGame,
	type TaggedGamesPage
} from "./mood-tags.interface";

export function gameCommunityTagSerializer(row: GameCommunityTagRow) {
	return { tag: row.tag, players: row.players, mine: row.mine };
}

export function communityTagSerializer(row: CommunityTagStatsRow) {
	return { tag: row.tag, games: row.games, players: row.players };
}

function taggedGameSerializer(entry: TaggedGame) {
	return {
		...gameRatioSummarySerializer(entry.game.get({ plain: true })),
		players: entry.players
	};
}

export function taggedGamesPageSerializer(page: TaggedGamesPage) {
	return {
		tag: page.tag,
		total: page.total,
		games: page.games.map(taggedGameSerializer)
	};
}

export function favoriteTagSerializer(meta: MoodTagMeta) {
	return {
		tag: meta.tag,
		description: meta.description,
		icon: meta.icon,
		color: meta.color
	};
}
