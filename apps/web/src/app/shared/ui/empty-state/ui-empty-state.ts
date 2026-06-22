import { ChangeDetectionStrategy, Component, input } from "@angular/core";

@Component({
	selector: "ui-empty-state",
	template: `
		<div class="flex flex-col items-center text-center py-12 px-4">
			<div
				class="relative flex items-center justify-center w-28 h-28 mb-5 rounded-full bg-brand/8 ring-1 ring-brand/15"
			>
				<div
					class="absolute inset-2 rounded-full bg-gradient-to-br from-brand/20 to-brand/5 blur-md"
				></div>
				<span
					class="material-icons relative text-[3.5rem] bg-gradient-to-br from-brand to-brand-deep bg-clip-text text-transparent"
					style="-webkit-text-fill-color: transparent;"
				>{{ icon() }}</span>
			</div>
			<h3 class="font-display text-lg font-semibold text-fg m-0 mb-1.5">
				{{ title() }}
			</h3>
			@if (hint()) {
				<p class="text-sm text-fg-muted leading-relaxed max-w-md m-0 mb-5">
					{{ hint() }}
				</p>
			}
			<ng-content />
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiEmptyState {
	icon = input.required<string>();
	title = input.required<string>();
	hint = input<string>("");
}
