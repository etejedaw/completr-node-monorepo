import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";

import { GamePoster } from "../../../../shared/components/game-poster/game-poster";
import { type PosterGridGame } from "./game-poster-grid.model";

@Component({
	selector: "app-game-poster-grid",
	imports: [RouterLink, GamePoster],
	template: `
		<ul
			class="list-none m-0 p-0"
			[class]="
				wide()
					? 'flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-[var(--page-pad-x)] px-[var(--page-pad-x)] scroll-px-[var(--page-pad-x)] [scrollbar-width:thin]'
					: 'grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4'
			"
		>
			@for (game of games(); track game.id) {
				<li
					[class]="
						wide() ? 'shrink-0 snap-start w-32 sm:w-36 lg:w-40' : ''
					"
				>
					<a
						class="group flex flex-col gap-2 no-underline"
						[routerLink]="['/games', game.code]"
					>
						<span class="relative block">
							<app-game-poster
								[src]="game.coverUrl ?? game.backgroundUrl"
								[title]="game.title"
								[width]="420"
								class="w-full aspect-[2/3] rounded-lg ring-1 ring-white/10 shadow-lg shadow-black/40 transition duration-200 group-hover:-translate-y-1 group-hover:ring-brand/60 group-focus-visible:ring-brand"
							/>
							@if (game.ratio) {
								<span
									class="absolute left-1.5 bottom-1.5 px-1.5 py-0.5 rounded-md bg-canvas/85 backdrop-blur border border-brand/40 text-brand text-xs font-bold tabular-nums leading-none transition duration-200 group-hover:-translate-y-1"
									[attr.aria-label]="'Ratio ' + game.ratio"
									>{{ game.ratio }}</span
								>
							}
						</span>
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
	readonly games = input.required<PosterGridGame[]>();
	readonly wide = input(false);
}
