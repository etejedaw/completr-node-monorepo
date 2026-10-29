import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	linkedSignal,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import {
	type GenerateRewindRequest,
	type Rewind,
	type RewindLanguage
} from "../../../../core/models/rewind.model";
import { AuthService } from "../../../../core/services/auth";
import { SegmentedControl } from "../../../../shared/components/segmented-control/segmented-control";
import { type SegmentedOption } from "../../../../shared/components/segmented-control/segmented-control.model";
import { UiAlert, UiButton, UiDialog, UiSwitch } from "../../../../shared/ui";
import { type RewindGenerateError } from "../../rewind-errors";

const LANGUAGE_OPTIONS: SegmentedOption<RewindLanguage>[] = [
	{ value: "en", label: "English" },
	{ value: "es", label: "Español" }
];

const RETRYABLE_ERRORS: readonly RewindGenerateError[] = [
	"invalid",
	"rate_limited",
	"failed",
	"network"
];

const BLOCKING_ERRORS: readonly RewindGenerateError[] = ["limit", "not_found"];

const GRACE_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
	month: "short",
	day: "numeric",
	timeZone: "UTC"
});

export function formatGraceDate(isoDate: string): string {
	return GRACE_DATE_FORMAT.format(new Date(`${isoDate}T00:00:00Z`));
}

@Component({
	selector: "app-rewind-generate-dialog",
	imports: [
		RouterLink,
		SegmentedControl,
		UiAlert,
		UiButton,
		UiDialog,
		UiSwitch
	],
	template: `
		<ui-dialog
			size="sm"
			eyebrow="Rewind"
			[heading]="heading()"
			[subheading]="subheading()"
			(closed)="closed.emit()"
		>
			<form
				class="flex flex-col gap-5"
				[attr.aria-busy]="pending()"
				(submit)="$event.preventDefault(); submit()"
			>
				@if (controls()) {
					<div
						class="flex flex-col gap-1 rounded-card border border-line bg-surface px-3 py-2.5 text-[0.8125rem]"
					>
						<p class="m-0 text-fg tabular-nums">
							{{ regenerationsLine() }}
						</p>
						@if (graceLine(); as grace) {
							<p class="m-0 text-fg-secondary">{{ grace }}</p>
						}
						<p class="m-0 text-fg-secondary">
							{{ replaceWarning() }}
						</p>
					</div>
				}

				<fieldset class="m-0 flex flex-col gap-2 border-0 p-0">
					<legend
						class="mb-2 p-0 text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-fg-secondary"
					>
						Language
					</legend>
					<app-segmented-control
						label="Rewind language"
						[options]="languageOptions"
						[(value)]="language"
					/>
					<p class="m-0 text-[0.8125rem] text-fg-muted">
						Everyone who opens this Rewind reads it in this
						language.
					</p>
				</fieldset>

				@if (isPremium()) {
					<div class="flex flex-col gap-2">
						<ui-switch
							label="Include private runs"
							[(checked)]="includePrivateRuns"
							[disabled]="pending()"
						/>
						@if (includePrivateRuns()) {
							<ui-alert tone="warning" icon="visibility">
								Your AI recap and premium stats may mention
								private games, and anyone who can see your
								Rewind will read them.
							</ui-alert>
						} @else {
							<p class="m-0 text-[0.8125rem] text-fg-muted">
								Off by default. Only your AI recap and premium
								stats use private runs.
							</p>
						}
					</div>
					<div class="flex flex-col gap-2">
						<ui-switch
							label="Use my notes"
							[(checked)]="includeNotes"
							[disabled]="pending()"
						/>
						@if (includeNotes()) {
							<ui-alert tone="info" icon="edit_note">
								Your AI recap reads your notes to understand you
								as a player. Anyone who can see your Rewind will
								read the recap, so it never quotes them word for
								word or names people.
							</ui-alert>
						} @else {
							<p class="m-0 text-[0.8125rem] text-fg-muted">
								Off by default. Only your AI recap reads your
								notes.
							</p>
						}
					</div>
				}

				@if (pending()) {
					<div
						role="status"
						class="flex items-center gap-3 rounded-card border border-line bg-surface px-3 py-3"
					>
						<span
							aria-hidden="true"
							class="material-icons shrink-0 text-xl text-brand motion-safe:animate-spin"
							>autorenew</span
						>
						<span class="flex flex-col gap-0.5 text-[0.8125rem]">
							<span class="text-fg">{{ progressLine() }}</span>
							<span class="text-fg-muted"
								>You can close this window. We'll let you know
								when it's ready.</span
							>
						</span>
					</div>
				} @else if (errorMessage(); as message) {
					<ui-alert [tone]="isRetryable() ? 'danger' : 'warning'">
						<span class="block">{{ message }}</span>
						@if (error() === "conflict") {
							<a
								class="mt-1 inline-flex tap:min-h-[44px] items-center font-semibold text-brand hover:text-brand-hover"
								[routerLink]="[
									'/user',
									username(),
									'rewind',
									year()
								]"
								(click)="closed.emit()"
								>See your Rewind</a
							>
						}
					</ui-alert>
				}

				<div
					class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
				>
					<button
						uiButton
						type="button"
						variant="ghost"
						class="tap:min-h-[44px] max-sm:!w-full"
						(click)="closed.emit()"
					>
						{{ pending() ? "Close" : "Cancel" }}
					</button>
					<button
						uiButton
						type="submit"
						variant="primary"
						class="tap:min-h-[44px] max-sm:!w-full"
						[disabled]="!canSubmit()"
					>
						{{ submitLabel() }}
					</button>
				</div>
			</form>
		</ui-dialog>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindGenerateDialog {
	readonly username = input.required<string>();
	readonly year = input.required<number>();
	readonly rewind = input<Rewind | null>(null);
	readonly pending = input(false);
	readonly error = input<RewindGenerateError | null>(null);
	readonly submitted = output<GenerateRewindRequest>();
	readonly closed = output<void>();

	protected readonly isPremium = inject(AuthService).isPremium;
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
		if (left <= 0) return "No regular regenerations left";
		return left === 1
			? "1 regeneration left"
			: `${left} regenerations left`;
	});
	protected readonly graceLine = computed(() => {
		const graceEndsAt = this.controls()?.graceEndsAt;
		return graceEndsAt
			? `Extra regeneration available until ${formatGraceDate(graceEndsAt)}`
			: null;
	});
	protected readonly replaceWarning = computed(() =>
		this.rewind()?.aiRecap
			? "Regenerating replaces your current Rewind and its AI recap."
			: "Regenerating replaces your current Rewind."
	);
	protected readonly progressLine = computed(() =>
		this.isPremium()
			? "Rewinding your year… this can take up to a minute."
			: "Rewinding your year…"
	);
	protected readonly isRetryable = computed(() => {
		const error = this.error();
		return error !== null && RETRYABLE_ERRORS.includes(error);
	});
	protected readonly canSubmit = computed(() => {
		if (this.pending()) return false;
		const error = this.error();
		if (error !== null && BLOCKING_ERRORS.includes(error)) return false;
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
				return `You've used every regeneration for ${year}.`;
			case "not_found":
				return `There's nothing to rewind for ${year} yet. A Rewind needs games started or finished that year.`;
			case "invalid":
				return "Something in the request wasn't valid. Try again.";
			case "rate_limited":
				return "Too many attempts. Wait a moment and try again.";
			case "network":
				return "You seem to be offline. Check your connection and try again.";
			case "failed":
				return "We couldn't generate your Rewind. Try again.";
			default:
				return null;
		}
	});

	protected submit() {
		if (!this.canSubmit()) return;
		this.submitted.emit({
			language: this.language(),
			includePrivateRuns: this.isPremium() && this.includePrivateRuns(),
			includeNotes: this.isPremium() && this.includeNotes(),
			expectedGeneratedAt: this.rewind()?.generatedAt ?? null
		});
	}
}
