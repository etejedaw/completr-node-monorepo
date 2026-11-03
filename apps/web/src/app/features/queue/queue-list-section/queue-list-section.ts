import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { UiEyebrow } from "../../../shared/ui";

@Component({
	selector: "app-queue-list-section",
	imports: [UiEyebrow],
	template: `
		<section aria-labelledby="queue-list-heading">
			<h2 uiEyebrow id="queue-list-heading" class="m-0 mb-1">
				@if (afterFeatured()) {
					After that
				} @else {
					Results
				}
			</h2>
			<ng-content />
		</section>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class QueueListSection {
	readonly afterFeatured = input.required<boolean>();
}
