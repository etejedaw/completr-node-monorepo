import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	linkedSignal,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import {
	type GenerateRewindRequest,
	type Rewind,
	type RewindLanguage,
	type RewindPremiumAccess
} from "../../../../core/models/rewind.model";
import {
	UiAlert,
	UiButton,
	UiDialog,
	UiFieldLabel,
	UiSegmentedControl,
	type UiSegmentedOption,
	UiSwitch
} from "../../../../shared/ui";
import { DEFAULT_REWIND_LANGUAGE } from "../../rewind-copy";
import { formatRewindDay } from "../../rewind-dates";
import {
	BLOCKING_GENERATE_ERRORS,
	type RewindGenerateError
} from "../../rewind-errors";
import { RewindAiProviderNotice } from "../rewind-ai-provider-notice/rewind-ai-provider-notice";
import { RewindAiRecapSwitches } from "../rewind-ai-recap-switches/rewind-ai-recap-switches";

const LANGUAGE_OPTIONS: UiSegmentedOption<RewindLanguage>[] = [
	{ value: "en", label: "English" },
	{ value: "es", label: "Español" }
];

const RETRYABLE_ERRORS: readonly RewindGenerateError[] = [
	"invalid",
	"rate_limited",
	"failed",
	"network"
];

@Component({
	selector: "app-rewind-generate-dialog",
	imports: [
		RewindAiProviderNotice,
		RewindAiRecapSwitches,
		RouterLink,
		UiSegmentedControl,
		UiAlert,
		UiButton,
		UiDialog,
		UiFieldLabel,
		UiSwitch
	],
	templateUrl: "./rewind-generate-dialog.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindGenerateDialog {
	readonly username = input.required<string>();
	readonly year = input.required<number>();
	readonly rewind = input<Rewind | null>(null);
	readonly premiumAccess = input<RewindPremiumAccess | null>(null);
	readonly canWriteAiRecap = input(true);
	readonly pending = input(false);
	readonly error = input<RewindGenerateError | null>(null);
	readonly submitted = output<GenerateRewindRequest>();
	readonly closed = output<void>();

	protected readonly hasPremiumAccess = computed(
		() => this.premiumAccess()?.allowed ?? false
	);
	protected readonly languageOptions = LANGUAGE_OPTIONS;
	protected readonly language = linkedSignal<RewindLanguage>(
		() => this.rewind()?.language ?? "en"
	);
	protected readonly includePrivateRuns = linkedSignal(
		() => this.rewind()?.ownerControls?.includesPrivateRuns ?? false
	);
	protected readonly includeNotes = linkedSignal(
		() => this.rewind()?.ownerControls?.includesNotes ?? false
	);
	protected readonly isRegeneration = computed(() => this.rewind() !== null);
	protected readonly isAiRecapOutOfGenerations = computed(
		() =>
			!this.isRegeneration() &&
			(!this.canWriteAiRecap() || this.error() === "limit")
	);
	protected readonly writeAiRecap = linkedSignal(
		() => !this.isAiRecapOutOfGenerations()
	);
	protected readonly writesAiRecap = computed(
		() => this.isRegeneration() || this.writeAiRecap()
	);
	protected readonly writeAiRecapHint = computed(() => {
		if (this.isAiRecapOutOfGenerations())
			return `No AI generations left for ${this.year()}. You can still generate your Rewind, and your premium stats are added either way.`;
		return this.writeAiRecap()
			? "Your premium stats are added either way."
			: "You can add it later from your Rewind. Your premium stats are added either way.";
	});
	protected readonly controls = computed(
		() => this.rewind()?.ownerControls ?? null
	);
	protected readonly heading = computed(() =>
		this.isRegeneration()
			? `Regenerate your ${this.year()} Rewind`
			: `Generate your ${this.year()} Rewind`
	);
	protected readonly subheading = computed(() =>
		this.isRegeneration()
			? "Pick the language again and rebuild your year."
			: "Your year stays hidden from everyone until you generate it."
	);
	protected readonly regenerationsLine = computed(() => {
		const left = this.controls()?.regenerationsLeft ?? 0;
		if (left <= 0) return "No AI generations left";
		return left === 1
			? "1 AI generation left"
			: `${left} AI generations left`;
	});
	protected readonly graceLine = computed(() => {
		const graceEndsAt = this.controls()?.graceEndsAt;
		return graceEndsAt
			? `Extra AI generation available until ${formatRewindDay(graceEndsAt, DEFAULT_REWIND_LANGUAGE)}`
			: null;
	});
	protected readonly replaceWarning = computed(() =>
		this.rewind()?.aiRecap
			? "Regenerating replaces your current Rewind and its AI recap."
			: "Regenerating replaces your current Rewind."
	);
	protected readonly progressLine = computed(() =>
		this.hasPremiumAccess() && this.writesAiRecap()
			? "Rewinding your year… this can take up to a minute."
			: "Rewinding your year…"
	);
	protected readonly isRetryable = computed(() => {
		const error = this.error();
		return error !== null && RETRYABLE_ERRORS.includes(error);
	});
	protected readonly canSubmit = computed(() => {
		if (this.pending() || this.premiumAccess() === null) return false;
		const error = this.error();
		if (error !== null && this.blocksSubmit(error)) return false;
		const controls = this.controls();
		return controls === null || controls.canRegenerate;
	});
	protected readonly submitLabel = computed(() => {
		if (this.pending()) return "Rewinding…";
		if (this.isRetryable()) return "Try again";
		return this.isRegeneration() ? "Regenerate" : "Generate";
	});
	protected readonly errorMessage = computed(() => {
		const year = this.year();
		switch (this.error()) {
			case "conflict":
				return `Your ${year} Rewind was updated from another tab or device. We loaded the latest version.`;
			case "limit":
				return this.isRegeneration()
					? `You've used every AI generation for ${year}.`
					: `You've used every AI generation for ${year}. We turned off the AI recap so you can generate your Rewind without it.`;
			case "period_closed":
				return `Rewind ${year} is closed. Your Rewinds stay as they were when it closed.`;
			case "year_requires_premium":
				return "Rewinds of previous years can only be generated with Premium.";
			case "premium_required":
				return "Regenerating needs Premium or a Rewind gift. Your current Rewind stays as it is.";
			case "not_found":
				return `There's nothing to rewind for ${year} yet. A Rewind needs games started or finished that year.`;
			case "invalid":
				return "Something in the request wasn't valid. Try again.";
			case "rate_limited":
				return "Too many attempts. Wait a moment and try again.";
			case "daily_limit":
				return this.isRegeneration()
					? "You've reached today's AI recap limit. Try again tomorrow."
					: "You've reached today's AI recap limit. Turn off the AI recap to generate your Rewind now, or try again tomorrow.";
			case "network":
				return "You seem to be offline. Check your connection and try again.";
			case "failed":
				return "We couldn't generate your Rewind. Try again.";
			default:
				return null;
		}
	});

	private blocksSubmit(error: RewindGenerateError): boolean {
		if (error === "limit" && !this.isRegeneration()) return false;
		return BLOCKING_GENERATE_ERRORS.includes(error);
	}

	protected submit() {
		if (!this.canSubmit()) return;
		this.submitted.emit({
			language: this.language(),
			includePrivateRuns:
				this.hasPremiumAccess() && this.includePrivateRuns(),
			includeNotes:
				this.hasPremiumAccess() &&
				this.writesAiRecap() &&
				this.includeNotes(),
			writeAiRecap: this.hasPremiumAccess() && this.writesAiRecap(),
			expectedGeneratedAt: this.rewind()?.generatedAt ?? null
		});
	}
}
