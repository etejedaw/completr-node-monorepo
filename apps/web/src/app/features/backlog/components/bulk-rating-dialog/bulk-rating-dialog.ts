import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	linkedSignal,
	output,
	signal
} from "@angular/core";

import { StarRating } from "../../../../shared/components/star-rating/star-rating";
import {
	UiAlert,
	UiButton,
	UiDialog,
	UiFieldLabel,
	UiSwitch
} from "../../../../shared/ui";
import { countOf } from "../../../../shared/utils/bulk-feedback";
import { type BulkRatingChange } from "./bulk-rating-dialog.model";

const RUN_NOUN = { one: "run", other: "runs" };
const NOT_STARTED_NOUN = {
	one: "not started run",
	other: "not started runs"
};
const RATED_NOUN = { one: "run already has", other: "runs already have" };

@Component({
	selector: "app-bulk-rating-dialog",
	imports: [StarRating, UiAlert, UiButton, UiDialog, UiFieldLabel, UiSwitch],
	template: `
		<ui-dialog
			eyebrow="Rate"
			size="sm"
			icon="star"
			[heading]="'Rate ' + runsText() + '?'"
			[subheading]="selectedText() + ' selected'"
			(closed)="cancelled.emit()"
		>
			<div class="flex flex-col gap-4">
				<div>
					<span id="bulk-rating-label" uiFieldLabel>Your rating</span>
					<app-star-rating
						ariaLabelledby="bulk-rating-label"
						[value]="rating()"
						(ratingChange)="rating.set($event)"
					/>
				</div>
				@if (notStartedCount() > 0) {
					<div
						class="flex items-center gap-3 min-h-[52px] py-2 border-y border-line"
					>
						<span
							aria-hidden="true"
							class="material-icons shrink-0 grid place-items-center w-9 h-9 rounded-lg bg-surface border border-line text-lg text-fg-secondary"
							>schedule</span
						>
						<span class="flex-1 min-w-0">
							<span class="block text-sm text-fg"
								>Include not started runs</span
							>
							<span class="block text-[0.6875rem] text-fg-muted"
								>{{ notStartedText() }} in your selection</span
							>
						</span>
						<ui-switch
							ariaLabel="Include not started runs"
							[checked]="includeNotStarted()"
							(checkedChange)="includeNotStarted.set($event)"
						/>
					</div>
				}
				@if (ratedCount() > 0) {
					<ui-alert tone="warning" role="status">{{
						replacedText()
					}}</ui-alert>
				}
				@if (skippedCount() > 0) {
					<ui-alert tone="info">{{ skippedText() }}</ui-alert>
				}
			</div>
			<ng-container dialogFooter>
				<button uiButton variant="ghost" (click)="cancelled.emit()">
					Cancel
				</button>
				<button
					uiButton
					variant="primary"
					[disabled]="rating() === null || targetCount() === 0"
					(click)="confirm()"
				>
					Rate {{ runsText() }}
				</button>
			</ng-container>
		</ui-dialog>
	`,
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BulkRatingDialog {
	readonly startedCount = input.required<number>();
	readonly notStartedCount = input(0);
	readonly ratedStartedCount = input(0);
	readonly ratedNotStartedCount = input(0);

	readonly confirmed = output<BulkRatingChange>();
	readonly cancelled = output<void>();

	protected readonly rating = signal<number | null>(null);
	protected readonly includeNotStarted = linkedSignal(
		() => this.startedCount() === 0
	);

	protected readonly targetCount = computed(() =>
		this.includeNotStarted()
			? this.startedCount() + this.notStartedCount()
			: this.startedCount()
	);
	protected readonly skippedCount = computed(() =>
		this.includeNotStarted() ? 0 : this.notStartedCount()
	);
	protected readonly ratedCount = computed(() =>
		this.includeNotStarted()
			? this.ratedStartedCount() + this.ratedNotStartedCount()
			: this.ratedStartedCount()
	);

	protected readonly runsText = computed(() =>
		countOf(this.targetCount(), RUN_NOUN)
	);
	protected readonly selectedText = computed(() =>
		countOf(this.startedCount() + this.notStartedCount(), RUN_NOUN)
	);
	protected readonly notStartedText = computed(() =>
		countOf(this.notStartedCount(), NOT_STARTED_NOUN)
	);
	protected readonly skippedText = computed(
		() => `${this.notStartedText()} will be skipped`
	);
	protected readonly replacedText = computed(
		() =>
			`${countOf(this.ratedCount(), RATED_NOUN)} a rating. It will be replaced.`
	);

	protected confirm() {
		const rating = this.rating();
		if (rating === null || this.targetCount() === 0) return;
		this.confirmed.emit({
			rating,
			includeNotStarted: this.includeNotStarted()
		});
	}
}
