import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type RewindFinishedGame } from "../../../../core/models/rewind.model";
import { GamePoster } from "../../../../shared/components/game-poster/game-poster";
import { monthName, shortDate, utcMonth } from "../../rewind-copy";

interface FinishedMonth {
	month: number;
	name: string;
	games: RewindFinishedGame[];
}

function groupByMonth(games: RewindFinishedGame[]): FinishedMonth[] {
	const months = new Map<number, RewindFinishedGame[]>();
	for (const game of games) {
		const month = utcMonth(game.finishedAt);
		months.set(month, [...(months.get(month) ?? []), game]);
	}
	return [...months.entries()]
		.sort(([a], [b]) => a - b)
		.map(([month, monthGames]) => ({
			month,
			name: monthName(month),
			games: monthGames
		}));
}

@Component({
	selector: "app-rewind-finished-games",
	imports: [RouterLink, GamePoster],
	template: `
		<div class="flex flex-col gap-8">
			@for (group of months(); track group.month) {
				<section [attr.aria-labelledby]="'rewind-month-' + group.month">
					<h3
						class="m-0 mb-3 font-display text-base font-semibold text-fg-secondary"
						[id]="'rewind-month-' + group.month"
					>
						{{ group.name }}
					</h3>
					<ol class="poster-grid list-none m-0 p-0">
						@for (game of group.games; track game.gameId) {
							<li>
								<a
									class="group flex flex-col gap-1.5 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand rounded-md"
									[routerLink]="['/games', game.code]"
								>
									<app-game-poster
										class="aspect-[2/3] rounded-md ring-1 ring-line transition group-hover:ring-brand"
										[src]="game.coverUrl"
										[title]="game.title"
										[width]="200"
									/>
									<span
										class="text-xs text-fg-muted tabular-nums"
										>{{ dateOf(game) }}</span
									>
								</a>
							</li>
						}
					</ol>
				</section>
			}
		</div>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindFinishedGames {
	readonly games = input.required<RewindFinishedGame[]>();

	protected readonly months = computed(() => groupByMonth(this.games()));

	protected dateOf(game: RewindFinishedGame): string {
		return shortDate(game.finishedAt);
	}
}
