import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type RewindYearSummary } from "../../../../core/models/rewind.model";
import { GamePoster } from "../../../../shared/components/game-poster/game-poster";
import {
	REWIND_YEAR_FILL_CLASS,
	TONE_TINT_CLASS,
	TONE_TINT_SECONDARY_CLASS,
	toneVar,
	yearTone
} from "../../rewind-tone";
import { RewindPersonaRank } from "../rewind-persona-rank/rewind-persona-rank";

const CARD_COVER_COUNT = 3;

@Component({
	selector: "app-rewind-year-card",
	imports: [RouterLink, GamePoster, RewindPersonaRank],
	template: `
		<a
			class="group relative isolate flex h-full flex-col justify-between gap-5 overflow-hidden rounded-card p-4 sm:p-5 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
			[class]="tintClass"
			[style.--tone]="tone()"
			[routerLink]="['/user', username(), 'rewind', summary().year]"
		>
			<span class="flex flex-col gap-3">
				<span class="flex flex-col gap-1">
					<span
						class="font-display text-4xl sm:text-5xl font-bold leading-none tracking-tight tabular-nums"
						[class]="yearFillClass"
						>{{ summary().year }}</span
					>
					<span
						class="text-sm tabular-nums"
						[class]="tintSecondaryClass"
						>{{ headline() }}</span
					>
				</span>
				<app-rewind-persona-rank
					size="mini"
					[code]="summary().persona"
				/>
			</span>
			@if (covers().length > 0) {
				<span aria-hidden="true" class="flex gap-1.5">
					@for (cover of covers(); track cover.gameId) {
						<app-game-poster
							class="w-1/3 aspect-[2/3] rounded-md ring-1 ring-line transition-transform duration-300 ease-out motion-safe:group-hover:-translate-y-1"
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

	protected readonly yearFillClass = REWIND_YEAR_FILL_CLASS;
	protected readonly tintClass = TONE_TINT_CLASS;
	protected readonly tintSecondaryClass = TONE_TINT_SECONDARY_CLASS;
	protected readonly tone = computed(() =>
		toneVar(yearTone(this.summary().year))
	);
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
