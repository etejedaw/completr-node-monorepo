import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	linkedSignal,
	signal
} from "@angular/core";
import { Router, RouterLink } from "@angular/router";

import {
	type RewindLanguage,
	type RewindPeriod,
	type RewindPremiumAccess,
	type RewindYearSummary
} from "../../../../core/models/rewind.model";
import { CoverUrlPipe } from "../../../../shared/pipes/cover-url";
import { formatHours } from "../../rewind-copy";
import { generationBlockMessageOf } from "../../rewind-generation-block";
import { toneVar, yearTone } from "../../rewind-tone";
import { RewindGenerateDialog } from "../rewind-generate-dialog/rewind-generate-dialog";
import { injectRewindGenerateFlow } from "../rewind-generate-dialog/rewind-generate-flow";
import { RewindPersonaRank } from "../rewind-persona-rank/rewind-persona-rank";
import { REWIND_YEAR_CARD_COPY } from "./rewind-year-card.copy";

const CARTRIDGE_SHELL_CLASS =
	"relative isolate flex h-full w-full flex-col gap-3 sm:gap-3.5 rounded-[14px_14px_22px_22px] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-fg)_10%,var(--color-surface)),color-mix(in_oklab,var(--color-fg)_3%,var(--color-surface)))] px-3 pt-5 pb-3 sm:px-4 text-left text-fg no-underline shadow-[inset_0_2px_0_color-mix(in_oklab,var(--color-fg)_8%,transparent),0_0_0_1px_var(--color-line-hover),var(--shadow-card)] before:absolute before:inset-x-[18%] before:top-0 before:h-2.5 before:rounded-b-lg before:bg-canvas";
const CARTRIDGE_LIFT_CLASS =
	"cursor-pointer motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:hover:-translate-y-1 motion-safe:focus-visible:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand";
const TONE_LABEL_CLASS =
	"bg-[linear-gradient(135deg,var(--tone),color-mix(in_oklab,var(--tone)_45%,var(--color-brand)))]";
const TITLE_STRIP_CLASS =
	"flex flex-col items-start gap-2 px-3 py-2.5 @[21rem]:flex-row @[21rem]:flex-wrap @[21rem]:items-center @[21rem]:justify-between @[21rem]:gap-x-3";
const CARTRIDGE_GRIP_NOTCHES = [0, 1, 2, 3];
const PLACEHOLDER_LABEL_CLASS = "bg-line-hover";
const TONE_YEAR_FILL_CLASS = `${TONE_LABEL_CLASS} bg-clip-text text-transparent`;

@Component({
	selector: "app-rewind-year-card",
	imports: [
		NgTemplateOutlet,
		RouterLink,
		CoverUrlPipe,
		RewindGenerateDialog,
		RewindPersonaRank
	],
	templateUrl: "./rewind-year-card.html",
	host: { class: "@container block h-full" },
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

	protected readonly shellClass = CARTRIDGE_SHELL_CLASS;
	protected readonly liftingShellClass = `${CARTRIDGE_SHELL_CLASS} ${CARTRIDGE_LIFT_CLASS}`;
	protected readonly titleStripClass = TITLE_STRIP_CLASS;
	protected readonly gripNotches = CARTRIDGE_GRIP_NOTCHES;
	protected readonly toneLabelClass = TONE_LABEL_CLASS;
	protected readonly placeholderLabelClass = PLACEHOLDER_LABEL_CLASS;
	protected readonly yearFillClass = TONE_YEAR_FILL_CLASS;
	protected readonly tone = computed(() =>
		toneVar(yearTone(this.summary().year))
	);

	private readonly artCandidates = computed(() => {
		const [firstCover] = this.summary().covers;
		const urls = [firstCover?.backgroundUrl, firstCover?.coverUrl].filter(
			(url): url is string => !!url
		);
		return [...new Set(urls)];
	});
	private readonly failedArtCount = linkedSignal({
		source: this.artCandidates,
		computation: () => 0
	});
	protected readonly artUrl = computed(
		() => this.artCandidates()[this.failedArtCount()] ?? null
	);

	protected readonly headline = computed(() => {
		const { finishedCount, startedCount } = this.summary();
		const copy = this.copy();
		return finishedCount > 0
			? copy.finished(finishedCount)
			: copy.started(startedCount);
	});
	protected readonly stats = computed(() => {
		const hours = this.summary().hoursPlayed;
		if (hours <= 0) return this.headline();
		const formatted = formatHours(hours, this.language());
		return `${this.headline()} · ${this.copy().hours(formatted)}`;
	});

	protected onArtError(): void {
		this.failedArtCount.update(count => count + 1);
	}
}
