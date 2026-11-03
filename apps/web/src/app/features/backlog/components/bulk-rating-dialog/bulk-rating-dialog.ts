import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
	signal
} from "@angular/core";

import { StarRating } from "../../../../shared/components/star-rating/star-rating";
import {
	UiAlert,
	UiButton,
	UiDialog,
	UiFieldLabel
} from "../../../../shared/ui";
import { countOf } from "../../../../shared/utils/bulk-feedback";

const RUN_NOUN = { one: "run", other: "runs" };
const NOT_STARTED_NOUN = {
	one: "not started run",
	other: "not started runs"
};
const RATED_NOUN = { one: "run already has", other: "runs already have" };

@Component({
	selector: "app-bulk-rating-dialog",
	imports: [StarRating, UiAlert, UiButton, UiDialog, UiFieldLabel],
	template: `
		<ui-dialog
			eyebrow="Rate"
			size="sm"
			icon="star"
			[heading]="'Rate ' + runsText() + '?'"
			[subheading]="runsText() + ' selected'"
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
					[disabled]="rating() === null"
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
	readonly eligibleCount = input.required<number>();
	readonly skippedCount = input(0);
	readonly ratedCount = input(0);

	readonly confirmed = output<number>();
	readonly cancelled = output<void>();

	protected readonly rating = signal<number | null>(null);

	protected readonly runsText = computed(() =>
		countOf(this.eligibleCount(), RUN_NOUN)
	);
	protected readonly skippedText = computed(
		() =>
			`${countOf(this.skippedCount(), NOT_STARTED_NOUN)} will be skipped`
	);
	protected readonly replacedText = computed(
		() =>
			`${countOf(this.ratedCount(), RATED_NOUN)} a rating. It will be replaced.`
	);

	protected confirm() {
		const rating = this.rating();
		if (rating !== null) this.confirmed.emit(rating);
	}
}
