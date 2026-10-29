import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	signal
} from "@angular/core";
import { Router, RouterLink } from "@angular/router";

import {
	type RewindLanguage,
	type RewindYearSummary
} from "../../../../core/models/rewind.model";
import { GamePoster } from "../../../../shared/components/game-poster/game-poster";
import {
	REWIND_YEAR_FILL_CLASS,
	TONE_TINT_CLASS,
	TONE_TINT_SECONDARY_CLASS,
	toneVar,
	yearTone
} from "../../rewind-tone";
import { RewindGenerateDialog } from "../rewind-generate-dialog/rewind-generate-dialog";
import { injectRewindGenerateFlow } from "../rewind-generate-dialog/rewind-generate-flow";
import { RewindPersonaRank } from "../rewind-persona-rank/rewind-persona-rank";
import { REWIND_YEAR_CARD_COPY } from "./rewind-year-card.copy";

const CARD_COVER_COUNT = 3;

@Component({
	selector: "app-rewind-year-card",
	imports: [RouterLink, GamePoster, RewindGenerateDialog, RewindPersonaRank],
	template: `
		@if (isGenerated()) {
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
		} @else {
			<button
				type="button"
				class="group relative isolate flex h-full w-full cursor-pointer flex-col justify-between gap-5 overflow-hidden rounded-card border border-dashed border-line-hover p-4 sm:p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
				[class]="tintClass"
				[style.--tone]="tone()"
				[attr.aria-label]="generateLabel()"
				[attr.aria-busy]="generation.isPending()"
				(click)="generation.open()"
			>
				<span class="flex flex-col gap-3">
					<span class="flex flex-col gap-1">
						<span
							class="font-display text-4xl sm:text-5xl font-bold leading-none tracking-tight tabular-nums"
							[class]="yearFillClass"
							>{{ summary().year }}</span
						>
						<span class="text-sm" [class]="tintSecondaryClass">{{
							copy().readyToRewind
						}}</span>
					</span>
					<span
						class="inline-flex min-h-[44px] w-fit items-center gap-1.5 rounded-full bg-brand-solid px-3 text-sm font-semibold text-white transition-colors group-hover:bg-brand-solid-hover"
					>
						<span
							aria-hidden="true"
							class="material-icons text-base"
							>fast_rewind</span
						>
						{{
							generation.isPending()
								? copy().rewinding
								: copy().generate
						}}
					</span>
				</span>
				@if (covers().length > 0) {
					<span
						aria-hidden="true"
						class="flex gap-1.5 blur-[3px] saturate-50 opacity-60"
					>
						@for (cover of covers(); track cover.gameId) {
							<app-game-poster
								class="w-1/3 aspect-[2/3] rounded-md ring-1 ring-line"
								[src]="cover.coverUrl"
								[title]="cover.title"
								[width]="200"
								[compact]="true"
							/>
						}
					</span>
				}
			</button>
		}
		@if (generation.isOpen()) {
			<app-rewind-generate-dialog
				[username]="username()"
				[year]="summary().year"
				[rewind]="generation.latestRewind()"
				[pending]="generation.isPending()"
				[error]="generation.error()"
				(submitted)="generation.submit($event)"
				(closed)="generation.close()"
			/>
		}
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindYearCard {
	readonly username = input.required<string>();
	readonly summary = input.required<RewindYearSummary>();
	readonly language = input<RewindLanguage>("en");

	private readonly router = inject(Router);
	protected readonly copy = computed(
		() => REWIND_YEAR_CARD_COPY[this.language()]
	);
	private readonly generatedYear = signal<number | null>(null);

	protected readonly isGenerated = computed(
		() =>
			this.summary().isGenerated ||
			this.generatedYear() === this.summary().year
	);
	protected readonly generateLabel = computed(() =>
		this.copy().generateLabel(this.summary().year)
	);
	protected readonly generation = injectRewindGenerateFlow({
		username: () => this.username(),
		year: () => this.summary().year,
		onGenerated: rewind => this.generatedYear.set(rewind.year),
		onFinishedInDialog: rewind =>
			void this.router.navigate([
				"/user",
				this.username(),
				"rewind",
				rewind.year
			])
	});

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
		const copy = this.copy();
		return finishedCount > 0
			? copy.finished(finishedCount)
			: copy.started(startedCount);
	});
}
