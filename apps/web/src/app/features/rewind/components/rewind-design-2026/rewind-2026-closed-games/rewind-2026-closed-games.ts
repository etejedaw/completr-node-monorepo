import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

import {
	type RewindFinishedGame,
	type RewindLanguage
} from "../../../../../core/models/rewind.model";
import { GamePoster } from "../../../../../shared/components/game-poster/game-poster";
import { CoverUrlPipe } from "../../../../../shared/pipes/cover-url";
import { gameArtUrl } from "../../../../../shared/utils/game-art";
import {
	monthName,
	rewindCopy,
	shortDate,
	utcMonth
} from "../../../rewind-copy";
import { type RewindTimelineCopy } from "../../../rewind-copy.model";
import { REWIND_ABANDONED_POSTER_CLASS } from "../../../rewind-tone";
import {
	type ClosedGame,
	type ClosedMonth
} from "./rewind-2026-closed-games.model";

function toClosedGame(
	game: RewindFinishedGame,
	isAbandoned: boolean,
	language: RewindLanguage,
	text: RewindTimelineCopy
): ClosedGame {
	const date = shortDate(game.finishedAt, language);
	return {
		key: `${isAbandoned ? "abandoned" : "finished"}-${game.gameId}`,
		game,
		isAbandoned,
		label: isAbandoned
			? text.abandonedGameLabel(game.title, date)
			: `${game.title}, ${date}`,
		portraitUrl: gameArtUrl(game, "portrait")
	};
}

function interleaveByDate(
	finished: RewindFinishedGame[],
	abandoned: RewindFinishedGame[],
	language: RewindLanguage
): ClosedGame[] {
	const text = rewindCopy(language).timeline;
	return [
		...finished.map(game => toClosedGame(game, false, language, text)),
		...abandoned.map(game => toClosedGame(game, true, language, text))
	].sort((a, b) => a.game.finishedAt.localeCompare(b.game.finishedAt));
}

function monthArtUrl(entries: ClosedGame[]): string | null {
	const landscapeOf = (entry: ClosedGame) =>
		gameArtUrl(entry.game, "landscape");
	const firstFinished = entries
		.filter(entry => !entry.isAbandoned)
		.map(landscapeOf)
		.find(Boolean);
	return firstFinished ?? entries.map(landscapeOf).find(Boolean) ?? null;
}

function groupByMonth(
	entries: ClosedGame[],
	language: RewindLanguage
): ClosedMonth[] {
	const months = new Map<number, ClosedGame[]>();
	for (const entry of entries) {
		const month = utcMonth(entry.game.finishedAt);
		months.set(month, [...(months.get(month) ?? []), entry]);
	}
	const copy = rewindCopy(language);
	return [...months.entries()]
		.sort(([a], [b]) => a - b)
		.map(([month, monthGames]) => {
			const abandoned = monthGames.filter(
				entry => entry.isAbandoned
			).length;
			const finished = monthGames.length - abandoned;
			return {
				month,
				name: monthName(month, language),
				count: finished > 0 ? copy.highlights.games(finished) : null,
				abandonedCount:
					abandoned > 0
						? copy.timeline.abandonedGames(abandoned)
						: null,
				artUrl: monthArtUrl(monthGames),
				games: monthGames
			};
		});
}

@Component({
	selector: "app-rewind-2026-closed-games",
	imports: [RouterLink, GamePoster, CoverUrlPipe],
	templateUrl: "./rewind-2026-closed-games.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Rewind2026ClosedGames {
	readonly games = input.required<RewindFinishedGame[]>();
	readonly abandonedGames = input<RewindFinishedGame[]>([]);
	readonly language = input<RewindLanguage>("en");

	protected readonly abandonedPosterClass = REWIND_ABANDONED_POSTER_CLASS;

	protected readonly abandonedBadge = computed(
		() => rewindCopy(this.language()).timeline.abandonedBadge
	);

	protected readonly months = computed(() =>
		groupByMonth(
			interleaveByDate(
				this.games(),
				this.abandonedGames(),
				this.language()
			),
			this.language()
		)
	);
}
