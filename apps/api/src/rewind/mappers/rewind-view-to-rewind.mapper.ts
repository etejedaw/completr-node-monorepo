import {
	type Rewind,
	type RewindClosedGame,
	type RewindPlatinumGame,
	type RewindTotals,
	type RewindView,
	type RewindViewGame
} from "../rewind.interface";
import { type RewindLiveFields } from "../rewind-freeze.interface";
import { collectPlatinumRunIds } from "../utils/collect-platinum-run-ids.util";
import { pickVisiblePersona } from "../utils/pick-visible-persona.util";

function toClosedGame(
	game: RewindViewGame,
	platinumRunIds: ReadonlySet<string>
): RewindClosedGame {
	return {
		gameId: game.gameId,
		code: game.code,
		title: game.title,
		coverUrl: game.coverUrl,
		backgroundUrl: game.backgroundUrl,
		finishedAt: game.finishedAt,
		platformAbbreviation: game.platformAbbreviation,
		isPlatinumRun:
			game.backlogId !== undefined && platinumRunIds.has(game.backlogId)
	};
}

function visibleTotals(
	totals: RewindTotals,
	platinumsVisible: boolean
): RewindTotals {
	return platinumsVisible ? totals : { ...totals, platinums: null };
}

function toPlatinumGame(game: RewindPlatinumGame): RewindPlatinumGame {
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

function visiblePlatinumGames(
	view: RewindView,
	platinumsVisible: boolean
): RewindPlatinumGame[] | null {
	if (!platinumsVisible) return null;
	return (view.platinumGames ?? []).map(toPlatinumGame);
}

export function rewindViewToRewind(
	view: RewindView,
	live: RewindLiveFields
): Rewind {
	const platinumRunIds = live.platinumsVisible
		? collectPlatinumRunIds(view.platinumGames)
		: new Set<string>();
	const toVisibleClosedGame = (game: RewindViewGame) =>
		toClosedGame(game, platinumRunIds);

	return {
		year: view.year,
		persona: pickVisiblePersona(view, live.platinumsVisible),
		user: live.user,
		isSpotlight: live.isSpotlight,
		otherYears: live.otherYears,
		totals: visibleTotals(view.totals, live.platinumsVisible),
		finishedGames: view.finishedGames.map(toVisibleClosedGame),
		abandonedGames: (view.abandonedGames ?? []).map(toVisibleClosedGame),
		platinumGames: visiblePlatinumGames(view, live.platinumsVisible),
		highlights: {
			...view.highlights,
			classic: view.highlights.classic ?? null
		},
		yearMix: view.yearMix,
		language: view.language,
		generatedAt: view.generatedAt,
		design: view.design,
		frozenAt: view.frozenAt,
		aiRecap: view.aiRecap,
		premiumStats: view.premiumStats,
		premiumAccessKind: view.premiumAccessKind,
		ownerControls: live.ownerControls,
		premiumAccess: live.premiumAccess
	};
}
