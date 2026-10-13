import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";

import { type GameSummary } from "../../../../core/models";
import { GamePoster } from "../../../../shared/components/game-poster/game-poster";

@Component({
	selector: "app-game-dlc-list",
	imports: [RouterLink, GamePoster],
	template: `
		<ul class="list-none m-0 p-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
			@for (dlc of dlcs(); track dlc.id) {
				<li>
					<a
						class="group flex items-stretch h-full rounded-card overflow-hidden bg-surface/60 border border-line no-underline transition hover:-translate-y-0.5 hover:border-brand/60"
						[routerLink]="['/games', dlc.code]"
					>
						<app-game-poster
							[src]="dlc.backgroundUrl ?? dlc.coverUrl"
							[title]="dlc.title"
							[width]="420"
							[compact]="true"
							class="w-32 sm:w-40 shrink-0 aspect-video self-center transition duration-300 group-hover:brightness-110"
						/>
						<span
							class="flex-1 min-w-0 flex flex-col justify-center gap-1.5 px-4 py-3"
						>
							<span
								class="w-fit px-1.5 py-px rounded-full bg-brand/15 text-brand-hover text-[0.5625rem] font-bold uppercase tracking-wider"
								>DLC</span
							>
							<span
								class="text-sm font-semibold text-fg leading-snug line-clamp-2 transition group-hover:text-brand"
								>{{ dlc.title }}</span
							>
						</span>
						<span
							aria-hidden="true"
							class="material-icons self-center pr-3 text-base text-fg-muted transition group-hover:text-fg group-hover:translate-x-0.5"
							>chevron_right</span
						>
					</a>
				</li>
			}
		</ul>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameDlcList {
	readonly dlcs = input.required<GameSummary[]>();
}
