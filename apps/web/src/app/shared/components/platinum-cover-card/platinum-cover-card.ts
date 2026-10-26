import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";

import { type PlatinumEntry } from "../../../core/models";
import { GamePoster } from "../game-poster/game-poster";

@Component({
	selector: "app-platinum-cover-card",
	imports: [RouterLink, DatePipe, GamePoster],
	template: `
		<div class="flex flex-col gap-1.5 group">
			<a
				class="relative block rounded-lg overflow-hidden bg-surface ring-1 ring-platinum/25 shadow-lg shadow-black/40 transition duration-200 group-hover:-translate-y-1 group-hover:ring-platinum/70 group-hover:shadow-platinum/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platinum"
				[routerLink]="['/games', platinum().game.code]"
				[attr.aria-label]="platinum().game.title"
			>
				<app-game-poster
					[src]="platinum().game.backgroundUrl"
					[title]="platinum().game.title"
					[width]="420"
					class="block w-full aspect-[2/3]"
				/>
				<span
					aria-hidden="true"
					class="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-platinum/25 via-platinum/5 to-transparent pointer-events-none"
				></span>
				<span
					aria-hidden="true"
					class="absolute inset-x-0 bottom-0 h-0.5 bg-platinum/80"
				></span>
				<span
					aria-hidden="true"
					class="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-full bg-black/70 ring-1 ring-platinum/50 backdrop-blur-sm shadow-md shadow-black/40"
				>
					<span class="material-icons text-[1rem] text-platinum"
						>emoji_events</span
					>
				</span>
				@if (platinum().platform; as platform) {
					<span
						class="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold text-white bg-black/70 backdrop-blur-sm"
						[title]="platform.name"
						>{{ platform.abbreviation }}</span
					>
				}
			</a>
			<a
				tabindex="-1"
				class="tap-area text-xs font-medium text-fg-secondary truncate no-underline hover:text-platinum"
				[routerLink]="['/games', platinum().game.code]"
				>{{ platinum().game.title }}</a
			>
			@if (platinum().platinumedAt; as platinumedAt) {
				<time
					class="text-[0.6875rem] font-medium text-platinum/85 tabular-nums truncate"
					[attr.datetime]="platinumedAt"
					>{{ platinumedAt | date: "MMM d, y" }}</time
				>
			}
		</div>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlatinumCoverCard {
	readonly platinum = input.required<PlatinumEntry>();
}
