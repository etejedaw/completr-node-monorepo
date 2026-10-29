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
	template: `
		<ol class="relative list-none m-0 p-0 flex flex-col gap-8">
			<span
				aria-hidden="true"
				class="pointer-events-none absolute left-5 top-5 bottom-5 w-0.5 -translate-x-1/2 rounded-full bg-linear-to-b from-brand via-nav-queue to-nav-shelf opacity-70"
			></span>
			@for (group of months(); track group.month) {
				<li
					class="relative min-w-0"
					[style.--tone]="group.tone"
					[attr.aria-labelledby]="'rewind-month-' + group.month"
				>
					<div class="flex items-center gap-4">
						<span
							aria-hidden="true"
							class="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-(--tone) ring-2 ring-(--tone) shadow-[0_0_0_6px_var(--color-canvas)]"
						>
							<span class="material-icons text-[1.15rem]"
								>calendar_month</span
							>
						</span>
						<h3
							class="m-0 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5"
							[id]="'rewind-month-' + group.month"
						>
							<span
								class="font-display text-base md:text-lg font-semibold text-fg"
								>{{ group.name }}</span
							><span class="sr-only">, </span>
							<span
								class="text-xs font-medium tabular-nums text-fg-secondary"
								>{{ group.count }}</span
							>
						</h3>
					</div>
					<ol
						class="list-none m-0 mt-3 p-0 pl-14 grid grid-cols-3 gap-x-2.5 gap-y-4 min-[420px]:grid-cols-4 sm:grid-cols-6 md:grid-cols-[repeat(auto-fill,minmax(5.25rem,1fr))] md:gap-x-3"
					>
						@for (game of group.games; track game.gameId) {
							<li class="min-w-0">
								<a
									class="group flex flex-col gap-1.5 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand rounded-md"
									[routerLink]="['/games', game.code]"
								>
									<app-game-poster
										class="aspect-[2/3] rounded-md ring-1 ring-line transition group-hover:ring-(--tone)"
										[src]="game.coverUrl"
										[title]="game.title"
										[width]="200"
										titleSize="0.75rem"
									/>
									<span
										class="text-xs text-fg-secondary tabular-nums"
										>{{ dateOf(game) }}</span
									>
								</a>
							</li>
						}
					</ol>
				</li>
			}
		</ol>
	`,
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
