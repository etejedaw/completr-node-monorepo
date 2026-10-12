import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";

import { type GameSummary } from "../../../../core/models";
import { GamePoster } from "../../../../shared/components/game-poster/game-poster";

@Component({
	selector: "app-game-poster-grid",
	imports: [RouterLink, GamePoster],
	template: `
		<ul
			class="list-none m-0 p-0 grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4"
		>
			@for (game of games(); track game.id) {
				<li>
					<a
						class="group flex flex-col gap-2 no-underline"
						[routerLink]="['/games', game.code]"
					>
						<app-game-poster
							[src]="game.coverUrl ?? game.backgroundUrl"
							[title]="game.title"
							[width]="420"
							class="w-full aspect-[2/3] rounded-lg ring-1 ring-white/10 shadow-lg shadow-black/40 transition duration-200 group-hover:-translate-y-1 group-hover:ring-brand/60 group-focus-visible:ring-brand"
						/>
						<span
							class="text-xs sm:text-sm font-medium text-fg-secondary line-clamp-2 leading-snug transition group-hover:text-fg"
							>{{ game.title }}</span
						>
					</a>
				</li>
			}
		</ul>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GamePosterGrid {
	readonly games = input.required<GameSummary[]>();
}
