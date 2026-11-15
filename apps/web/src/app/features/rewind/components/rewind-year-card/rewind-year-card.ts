import { NgTemplateOutlet } from "@angular/common";
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
	type RewindPeriod,
	type RewindPremiumAccess,
	type RewindYearSummary
} from "../../../../core/models/rewind.model";
import { GamePoster } from "../../../../shared/components/game-poster/game-poster";
import { generationBlockMessageOf } from "../../rewind-generation-block";
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
	imports: [
		NgTemplateOutlet,
		RouterLink,
		GamePoster,
		RewindGenerateDialog,
		RewindPersonaRank
	],
	templateUrl: "./rewind-year-card.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindYearCard {
	readonly username = input.required<string>();
	readonly summary = input.required<RewindYearSummary>();
	readonly premiumAccess = input<RewindPremiumAccess | null>(null);
	readonly period = input<RewindPeriod | null>(null);
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
	protected readonly blockMessage = computed(() =>
		generationBlockMessageOf(
			{ ...this.summary(), isGenerated: this.isGenerated() },
			this.period(),
			this.language()
		)
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
