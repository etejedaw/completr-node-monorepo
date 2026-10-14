import { ChangeDetectionStrategy, Component, input } from "@angular/core";

@Component({
	selector: "ui-plain-empty-state",
	template: `
		<section
			class="flex flex-col items-center text-center px-6"
			[class.py-20]="!compact()"
			[class.py-16]="compact()"
		>
			<span
				aria-hidden="true"
				class="material-icons text-4xl text-fg-muted mb-3"
				>{{ icon() }}</span
			>
			<h2 class="m-0 font-display text-xl font-semibold text-fg">
				{{ title() }}
			</h2>
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
}
