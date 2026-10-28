import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type RewindYearSummary } from "../../../../core/models/rewind.model";
import { GamePoster } from "../../../../shared/components/game-poster/game-poster";

const CARD_COVER_COUNT = 3;

@Component({
	selector: "app-rewind-year-card",
	imports: [RouterLink, GamePoster],
	template: `
		<a
			class="group relative isolate flex h-full flex-col justify-between gap-6 overflow-hidden rounded-card border border-line bg-surface p-4 sm:p-5 no-underline transition-colors hover:border-line-hover hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
			[routerLink]="['/user', username(), 'rewind', summary().year]"
		>
			<span class="flex flex-col gap-1">
				<span
					class="font-display text-4xl sm:text-5xl font-bold leading-none tracking-tight text-fg tabular-nums group-hover:text-brand"
					>{{ summary().year }}</span
				>
				<span class="text-sm text-fg-secondary tabular-nums">{{
					headline()
				}}</span>
			</span>
			@if (covers().length > 0) {
				<span aria-hidden="true" class="flex gap-1.5">
					@for (cover of covers(); track cover.gameId) {
						<app-game-poster
							class="w-1/3 aspect-[2/3] rounded-md"
							[src]="cover.coverUrl"
							[title]="cover.title"
							[width]="200"
							[compact]="true"
						/>
					}
				</span>
			}
		</a>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindYearCard {
	readonly username = input.required<string>();
	readonly summary = input.required<RewindYearSummary>();

	protected readonly covers = computed(() =>
		this.summary().covers.slice(0, CARD_COVER_COUNT)
	);
	protected readonly headline = computed(() => {
		const { finishedCount, startedCount } = this.summary();
		return finishedCount > 0
			? `${finishedCount} finished`
			: `${startedCount} started`;
	});
}
