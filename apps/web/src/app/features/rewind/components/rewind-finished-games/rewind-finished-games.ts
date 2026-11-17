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
} from "../../../../core/models/rewind.model";
import { GamePoster } from "../../../../shared/components/game-poster/game-poster";
import { monthName, rewindCopy, shortDate, utcMonth } from "../../rewind-copy";
import { REWIND_ABANDONED_POSTER_CLASS } from "../../rewind-tone";
import {
	type FinishedMonth,
	type TimelineGame
} from "./rewind-finished-games.model";

const SEASON_TONES = [
	"var(--color-brand)",
	"var(--color-nav-queue)",
	"var(--color-nav-shelf)"
];

function seasonTone(month: number): string {
	return SEASON_TONES[Math.min(Math.floor((month - 1) / 4), 2)] ?? "";
}

function toTimelineGame(
	game: RewindFinishedGame,
	isAbandoned: boolean
): TimelineGame {
	return {
		key: `${isAbandoned ? "abandoned" : "finished"}-${game.gameId}`,
		game,
		isAbandoned
	};
}

function interleaveByDate(
	finished: RewindFinishedGame[],
	abandoned: RewindFinishedGame[]
): TimelineGame[] {
	return [
		...finished.map(game => toTimelineGame(game, false)),
		...abandoned.map(game => toTimelineGame(game, true))
	].sort((a, b) => a.game.finishedAt.localeCompare(b.game.finishedAt));
}

function groupByMonth(
	entries: TimelineGame[],
	language: RewindLanguage
): FinishedMonth[] {
	const months = new Map<number, TimelineGame[]>();
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
				tone: seasonTone(month),
				games: monthGames
			};
		});
}

@Component({
	selector: "app-rewind-finished-games",
	imports: [RouterLink, GamePoster],
	templateUrl: "./rewind-finished-games.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindFinishedGames {
	readonly games = input.required<RewindFinishedGame[]>();
	readonly abandonedGames = input<RewindFinishedGame[]>([]);
	readonly language = input<RewindLanguage>("en");

	protected readonly abandonedPosterClass = REWIND_ABANDONED_POSTER_CLASS;

	protected readonly copy = computed(
		() => rewindCopy(this.language()).timeline
	);

	protected readonly months = computed(() =>
		groupByMonth(
			interleaveByDate(this.games(), this.abandonedGames()),
			this.language()
		)
	);

	protected dateOf(game: RewindFinishedGame): string {
		return shortDate(game.finishedAt, this.language());
	}
}
