import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { type UiPlainEmptyStateHeadingLevel } from "./ui-plain-empty-state.model";

const HEADING_CLASS = "m-0 font-display text-fg";

@Component({
	selector: "ui-plain-empty-state",
	template: `
		<section
			class="flex flex-col items-center text-center px-6"
			[class.py-20]="!compact() && !inset()"
			[class.py-16]="compact() && !inset()"
			[class.py-6]="inset()"
		>
			<span
				aria-hidden="true"
				class="material-icons text-fg-muted mb-3"
				[class.text-4xl]="headingLevel() !== 1"
				[class.text-5xl]="headingLevel() === 1"
				>{{ icon() }}</span
			>
			@switch (headingLevel()) {
				@case (1) {
					<h1 [class]="headingClass + ' text-2xl font-bold'">
						{{ title() }}
					</h1>
				}
				@case (3) {
					<h3 [class]="headingClass + ' text-xl font-semibold'">
						{{ title() }}
					</h3>
				}
				@default {
					<h2 [class]="headingClass + ' text-xl font-semibold'">
						{{ title() }}
					</h2>
				}
			}
			<p
				class="m-0 mt-2 mb-6 text-sm text-fg-muted"
				[class.max-w-sm]="!compact()"
				[class.leading-relaxed]="!compact()"
			>
				{{ message() }}
			</p>
			<div class="flex flex-wrap justify-center gap-2">
				<ng-content />
			</div>
		</section>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiPlainEmptyState {
	readonly icon = input.required<string>();
	readonly title = input.required<string>();
	readonly message = input.required<string>();
	readonly compact = input(false);
	readonly inset = input(false);
	readonly headingLevel = input<UiPlainEmptyStateHeadingLevel>(2);

	protected readonly headingClass = HEADING_CLASS;
}
