import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import { type RewindGameRef } from "../../../../../core/models/rewind.model";
import { CoverUrlPipe } from "../../../../../shared/pipes/cover-url";
import { gameArtUrl } from "../../../../../shared/utils/game-art";
import {
	type Rewind2026FanPoster,
	type Rewind2026FanSource
} from "./rewind-2026-cover-fan.model";

export const REWIND_2026_FAN_LIMIT = 5;

const OUTER_POSTER_SIZE = 0.895;

function posterUrlOf(game: RewindGameRef): string | null {
	return gameArtUrl(game, "portrait");
}

function hasCover(game: RewindGameRef): boolean {
	return !!game.coverUrl?.trim();
}

export function selectRewind2026FanGames(
	rewind: Rewind2026FanSource,
	limit = REWIND_2026_FAN_LIMIT
): RewindGameRef[] {
	const latestFirst = [...rewind.finishedGames].reverse();
	const candidates = rewind.highlights.topRated
		? [rewind.highlights.topRated, ...latestFirst]
		: latestFirst;
	const seenGameIds = new Set<string>();
	const seenPosterUrls = new Set<string>();
	const distinct = candidates.filter(game => {
		const url = posterUrlOf(game);
		if (!url) return false;
		if (seenGameIds.has(game.gameId) || seenPosterUrls.has(url))
			return false;
		seenGameIds.add(game.gameId);
		seenPosterUrls.add(url);
		return true;
	});
	return [
		...distinct.filter(hasCover),
		...distinct.filter(game => !hasCover(game))
	].slice(0, limit);
}

function offsetsFromCenterOut(count: number): number[] {
	const center = (count - 1) / 2;
	return Array.from({ length: count }, (_, index) => index - center).sort(
		(a, b) => Math.abs(a) - Math.abs(b) || a - b
	);
}

export function rewind2026FanPosters(
	games: RewindGameRef[]
): Rewind2026FanPoster[] {
	const offsets = offsetsFromCenterOut(games.length);
	return games.map((game, rank) => {
		const offset = offsets[rank];
		return {
			gameId: game.gameId,
			url: posterUrlOf(game) ?? "",
			offset,
			depth: Math.abs(offset),
			size: 1 - Math.min(Math.abs(offset), 1) * (1 - OUTER_POSTER_SIZE),
			layer: games.length - rank
		};
	});
}

@Component({
	selector: "app-rewind-2026-cover-fan",
	imports: [CoverUrlPipe],
	templateUrl: "./rewind-2026-cover-fan.html",
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Rewind2026CoverFan {
	readonly rewind = input.required<Rewind2026FanSource>();

	protected readonly posters = computed(() =>
		rewind2026FanPosters(selectRewind2026FanGames(this.rewind()))
	);
}
