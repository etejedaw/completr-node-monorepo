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
import { type FinishedMonth } from "./rewind-finished-games.model";

const SEASON_TONES = [
	"var(--color-brand)",
	"var(--color-nav-queue)",
	"var(--color-nav-shelf)"
];

function seasonTone(month: number): string {
	return SEASON_TONES[Math.min(Math.floor((month - 1) / 4), 2)] ?? "";
}

function groupByMonth(
	games: RewindFinishedGame[],
	language: RewindLanguage
): FinishedMonth[] {
	const months = new Map<number, RewindFinishedGame[]>();
	for (const game of games) {
		const month = utcMonth(game.finishedAt);
		months.set(month, [...(months.get(month) ?? []), game]);
	}
	const copy = rewindCopy(language).highlights;
	return [...months.entries()]
		.sort(([a], [b]) => a - b)
		.map(([month, monthGames]) => ({
			month,
			name: monthName(month, language),
			count: copy.games(monthGames.length),
			tone: seasonTone(month),
			games: monthGames
		}));
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
	readonly language = input<RewindLanguage>("en");

	protected readonly months = computed(() =>
		groupByMonth(this.games(), this.language())
	);

	protected dateOf(game: RewindFinishedGame): string {
		return shortDate(game.finishedAt, this.language());
	}
}
