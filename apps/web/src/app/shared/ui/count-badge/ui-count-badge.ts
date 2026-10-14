import { ChangeDetectionStrategy, Component, input } from "@angular/core";

@Component({
	selector: "ui-count-badge",
	template: `{{ count() }}
		@if (srSuffix()) {
			<span class="sr-only">&nbsp;{{ srSuffix() }}</span>
		}`,
	host: {
		class: "inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-brand-solid text-white text-[0.625rem] font-bold leading-none tabular-nums"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiCountBadge {
	readonly count = input.required<number>();
	readonly srSuffix = input("active");
}
