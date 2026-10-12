import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import {
	type ComparisonDimension,
	type ComparisonGame
} from "../services/public-library.service";

export interface ComparisonOption {
	value: ComparisonDimension;
	label: string;
}

@Component({
	selector: "app-profile-in-common",
	imports: [RouterLink, GamePoster],
	template: `
		<section
			class="p-4 rounded-card border border-line bg-surface"
			aria-labelledby="in-common-heading"
		>
			<header class="flex items-center justify-between gap-3 mb-3">
				<h2
					id="in-common-heading"
					class="m-0 flex items-center gap-2 font-display text-base font-semibold text-fg"
				>
					<span
						aria-hidden="true"
						class="material-icons text-lg text-brand"
						>join_inner</span
					>
					You have in common
				</h2>
				<span
					class="font-display text-2xl font-bold text-brand tabular-nums leading-none"
					>{{ count() }}</span
				>
			</header>
			<div
				role="radiogroup"
				aria-label="Compare by"
				class="inline-flex gap-0.5 p-1 mb-4 bg-input-bg border border-line rounded-card"
			>
				@for (option of options(); track option.value) {
					<button
						type="button"
						role="radio"
						class="h-7 pointer-coarse:min-h-[44px] px-3 rounded-md border-0 text-xs font-medium cursor-pointer transition"
						[class]="
							selected() === option.value
								? 'bg-surface-hover text-fg'
								: 'bg-transparent text-fg-muted hover:text-fg'
						"
						[attr.aria-checked]="selected() === option.value"
						(click)="selectedChange.emit(option.value)"
					>
						{{ option.label }}
					</button>
				}
			</div>
			@if (loading()) {
				<p class="m-0 py-4 text-center text-sm text-fg-muted">
					Comparing libraries…
				</p>
			} @else if (isPrivate()) {
				<p class="m-0 py-4 text-center text-sm text-fg-muted">
					This part of their library is private.
				</p>
			} @else if (games().length === 0) {
				<p class="m-0 py-4 text-center text-sm text-fg-muted">
					Nothing in common here yet.
				</p>
			} @else {
				<ul class="list-none m-0 p-0 grid grid-cols-5 gap-2">
					@for (game of games().slice(0, 10); track game.id) {
						<li>
							<a
								class="group block"
								[routerLink]="['/games', game.code]"
								[attr.aria-label]="game.title"
								[title]="game.title"
							>
								<app-game-poster
									[src]="game.backgroundUrl"
									[title]="game.title"
									[width]="200"
									[compact]="true"
									class="w-full aspect-[2/3] rounded-md ring-1 ring-white/10 transition group-hover:ring-brand/60"
								/>
							</a>
						</li>
					}
				</ul>
				@if (count() > games().length) {
					<a
						class="mt-3 flex items-center justify-center gap-1 h-9 pointer-coarse:min-h-[44px] rounded-card border border-line text-xs font-medium text-brand no-underline transition hover:border-brand/40"
						[routerLink]="['/user', username(), 'in-common']"
						[queryParams]="{ by: selected() }"
					>
						See all {{ count() }}
						<span aria-hidden="true" class="material-icons text-sm"
							>arrow_forward</span
						>
					</a>
				}
			}
		</section>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileInCommon {
	readonly username = input.required<string>();
	readonly options = input.required<ComparisonOption[]>();
	readonly selected = input.required<ComparisonDimension>();
	readonly games = input<ComparisonGame[]>([]);
	readonly count = input(0);
	readonly loading = input(false);
	readonly isPrivate = input(false);

	readonly selectedChange = output<ComparisonDimension>();
}
