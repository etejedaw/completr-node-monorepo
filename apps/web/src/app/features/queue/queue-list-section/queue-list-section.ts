import { ChangeDetectionStrategy, Component, input } from "@angular/core";

@Component({
	selector: "app-queue-list-section",
	template: `
		<section aria-labelledby="queue-list-heading">
			<h2
				id="queue-list-heading"
				class="m-0 mb-1 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-fg-muted"
			>
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
