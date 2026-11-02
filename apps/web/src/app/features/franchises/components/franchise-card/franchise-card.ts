import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { GamePoster } from "../../../../shared/components/game-poster/game-poster";
import { type FranchiseSummary } from "../../franchises.model";

@Component({
	selector: "app-franchise-card",
	imports: [RouterLink, GamePoster],
	template: `
		<article
			class="group relative isolate flex flex-col justify-end aspect-[16/10] rounded-card overflow-hidden bg-surface ring-1 ring-line shadow-lg shadow-black/40 transition duration-200 hover:-translate-y-1 hover:ring-brand/60 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-brand motion-reduce:transition-none motion-reduce:hover:translate-y-0"
			[attr.aria-labelledby]="headingId()"
		>
			<div aria-hidden="true" class="absolute inset-0 -z-10 flex">
				@for (game of franchise().previewGames; track game.id) {
					<app-game-poster
						[src]="game.backgroundUrl"
						[title]="game.title"
						[width]="640"
						[compact]="true"
						class="flex-1 h-full transition duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
					/>
				} @empty {
					<div
						class="flex-1 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,var(--color-brand-subtle),transparent_70%)] text-fg-muted"
					>
						<span class="material-icons text-5xl opacity-40"
							>collections_bookmark</span
						>
					</div>
				}
			</div>
			<div
				aria-hidden="true"
				class="absolute inset-0 -z-10 bg-gradient-to-t from-canvas via-canvas/75 to-canvas/10"
			></div>

			<div class="p-4">
				<p
					class="m-0 text-[0.625rem] font-bold uppercase tracking-[0.18em] text-white/70 tabular-nums"
				>
					{{ franchise().gameCount }}
					{{ franchise().gameCount === 1 ? "game" : "games" }}
				</p>
				<h3
					[id]="headingId()"
					class="m-0 mt-1 font-display text-lg font-bold text-white leading-tight line-clamp-1 [text-shadow:0_2px_8px_rgb(0_0_0/0.7)]"
				>
					<a
						class="text-inherit no-underline outline-none after:absolute after:inset-0 after:content-['']"
						[routerLink]="['/franchises', franchise().code]"
						>{{ franchise().name }}</a
					>
				</h3>
				@if (franchise().description) {
					<p
						class="m-0 mt-1 text-xs text-white/75 line-clamp-2 leading-snug"
					>
						{{ franchise().description }}
					</p>
				}
			</div>

			<button
				type="button"
				class="absolute top-3 right-3 z-10 inline-flex items-center gap-1 h-[32px] tap:min-h-[44px] px-3 rounded-full border text-xs font-semibold cursor-pointer backdrop-blur-md transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60"
				[class]="
					tracked()
						? 'border-brand bg-canvas/80 text-brand'
						: 'border-white/30 bg-canvas/60 text-white hover:border-white/60'
				"
				[attr.aria-pressed]="tracked()"
				[attr.aria-busy]="pending()"
				[disabled]="pending()"
				(click)="trackToggled.emit()"
			>
				<span aria-hidden="true" class="material-icons text-sm">{{
					tracked() ? "check" : "add"
				}}</span>
				{{ tracked() ? "Tracking" : "Track" }}
				<span class="sr-only">{{ franchise().name }}</span>
			</button>
		</article>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class FranchiseCard {
	readonly franchise = input.required<FranchiseSummary>();
	readonly tracked = input(false);
	readonly pending = input(false);
	readonly trackToggled = output<void>();

	protected readonly headingId = computed(
		() => `franchise-${this.franchise().id}`
	);
}
