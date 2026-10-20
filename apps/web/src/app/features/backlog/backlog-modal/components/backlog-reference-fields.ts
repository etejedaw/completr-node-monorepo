import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
	type ElementRef,
	inject,
	Injector,
	input,
	model,
	output,
	signal,
	viewChild
} from "@angular/core";
import { type FieldTree, FormField } from "@angular/forms/signals";

import { type GameScore, type GameTime } from "../../../../core/models";
import { ScoreSourcesService } from "../../../../core/services/score-sources";
import {
	ChipGroup,
	type ChipOption
} from "../../../../shared/components/chip-group/chip-group";
import { UiButton, UiInput } from "../../../../shared/ui";
import { scrollIntoViewAndFocus } from "../focus-field";
import {
	correctedTypedValue,
	DURATION_SOURCE_NAMES,
	estimatedRatio,
	MAX_CRITIC_SCORE,
	roundToTwoDecimals,
	toCriticScore
} from "../reference-values";

export type ReferenceField = "score" | "duration";
export type MissingReferenceCategory = "missing_score" | "missing_duration";
type ReferenceTooltip = "ratio" | ReferenceField;

const REFERENCE_TOOLTIP_TEXTS: Record<ReferenceTooltip, string> = {
	ratio: "Ratio = Critic Score (1–5) ÷ Duration in hours × 20. Scores from other scales are normalized to 1–5 first; × 20 makes the result a 0–100 number that is easier to compare. Higher means short and well-rated — useful to prioritize what to play next.",
	score: "Average score from critics (Metacritic, OpenCritic, RAWG). Stored on a 0–5 scale — clicking a source button auto-normalizes the value for you.",
	duration:
		"Estimated playtime from HowLongToBeat or RAWG. Not your real playtime — that goes in Real Duration, under Tracking."
};

function hasVisibleError(field: FieldTree<number | null>): boolean {
	return field().touched() && field().invalid();
}

@Component({
	selector: "app-backlog-reference-fields",
	imports: [ChipGroup, FormField, UiButton, UiInput],
	templateUrl: "./backlog-reference-fields.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogReferenceFields {
	private readonly scoreSourcesService = inject(ScoreSourcesService);
	private readonly injector = inject(Injector);

	readonly score = input.required<FieldTree<number | null>>();
	readonly duration = input.required<FieldTree<number | null>>();
	readonly scores = input<readonly GameScore[]>([]);
	readonly times = input<readonly GameTime[]>([]);
	readonly showSourcesWhenEmpty = input(true);
	readonly reportFeedback = input("");
	readonly activeScoreSource = model("");
	readonly activeDurationSource = model("");
	readonly expanded = model(false);
	readonly missingReported = output<MissingReferenceCategory>();

	private readonly scoreInput =
		viewChild<ElementRef<HTMLInputElement>>("scoreInput");
	private readonly durationInput =
		viewChild<ElementRef<HTMLInputElement>>("durationInput");

	protected readonly maxCriticScore = MAX_CRITIC_SCORE;
	protected readonly openTooltip = signal<ReferenceTooltip | null>(null);
	protected readonly tooltipText = computed(() => {
		const tooltip = this.openTooltip();
		return tooltip ? REFERENCE_TOOLTIP_TEXTS[tooltip] : null;
	});

	protected readonly scoreChipOptions = computed<ChipOption[]>(() =>
		this.scores().map(entry => ({
			value: entry.source,
			label: `${entry.source} ${entry.score}${this.scaleLabel(entry.source)}`
		}))
	);
	protected readonly durationChipOptions = computed<ChipOption[]>(() =>
		this.times().map(entry => ({
			value: entry.source,
			label: `${entry.source} ${entry.duration}h`
		}))
	);

	protected readonly ratio = computed(() =>
		estimatedRatio(this.score()().value(), this.duration()().value())
	);
	protected readonly isCollapsed = computed(
		() =>
			!this.expanded() &&
			!this.score()().invalid() &&
			!this.duration()().invalid()
	);
	protected readonly summary = computed(() =>
		[
			`${this.scoreSourceLabel()} ${this.score()().value()}`,
			`${this.durationSourceLabel()} ${this.duration()().value()}h`,
			`Ratio ${this.ratio() ?? "—"}`
		].join(" · ")
	);

	protected readonly showScoreError = computed(() =>
		hasVisibleError(this.score())
	);
	protected readonly showDurationError = computed(() =>
		hasVisibleError(this.duration())
	);

	protected readonly showScoreSources = computed(
		() =>
			this.scores().length > 0 ||
			this.showSourcesWhenEmpty() ||
			this.score()().invalid()
	);
	protected readonly showDurationSources = computed(
		() =>
			this.times().length > 0 ||
			this.showSourcesWhenEmpty() ||
			this.duration()().invalid()
	);

	focusField(field: ReferenceField) {
		this.expanded.set(true);
		afterNextRender(
			() => {
				const target =
					field === "score"
						? this.scoreInput()
						: this.durationInput();
				if (target) scrollIntoViewAndFocus(target.nativeElement);
			},
			{ injector: this.injector }
		);
	}

	protected toggleTooltip(tooltip: ReferenceTooltip) {
		this.openTooltip.update(current =>
			current === tooltip ? null : tooltip
		);
	}

	protected pickScoreSource(values: readonly string[]) {
		const entry = this.scores().find(item => item.source === values[0]);
		if (!entry) return;
		this.expanded.set(true);
		this.activeScoreSource.set(entry.source);
		this.score()().value.set(
			toCriticScore(
				this.scoreSourcesService.normalize(entry.score, entry.source)
			)
		);
	}

	protected pickDurationSource(values: readonly string[]) {
		const entry = this.times().find(item => item.source === values[0]);
		if (!entry) return;
		this.expanded.set(true);
		this.activeDurationSource.set(entry.source);
		this.duration()().value.set(roundToTwoDecimals(entry.duration));
	}

	protected onScoreInput(event: Event) {
		this.activeScoreSource.set("");
		this.applyTypedValue(event, this.score(), MAX_CRITIC_SCORE);
	}

	protected onDurationInput(event: Event) {
		this.activeDurationSource.set("");
		this.applyTypedValue(event, this.duration());
	}

	private applyTypedValue(
		event: Event,
		field: FieldTree<number | null>,
		maxValue?: number
	) {
		this.expanded.set(true);
		const input = event.target as HTMLInputElement;
		const corrected = correctedTypedValue(input, maxValue);
		if (corrected === null) return;
		input.value = String(corrected);
		field().value.set(corrected);
	}

	private scaleLabel(source: string): string {
		const scale = this.scoreSourcesService.getScale(source);
		return scale ? `/${scale}` : "";
	}

	private scoreSourceLabel(): string {
		const code = this.activeScoreSource();
		if (!code) return "Score";
		return (
			this.scoreSourcesService
				.sources()
				.find(source => source.code === code)?.name ?? code
		);
	}

	private durationSourceLabel(): string {
		const code = this.activeDurationSource();
		if (!code) return "Duration";
		return DURATION_SOURCE_NAMES[code] ?? code;
	}
}
