import {
	ChangeDetectionStrategy,
	Component,
	input,
	model
} from "@angular/core";

import { type ViewModeOption } from "./view-mode-toggle.model";

@Component({
	selector: "app-view-mode-toggle",
	template: `
		<div
			role="group"
			aria-label="View mode"
			class="flex gap-0.5 bg-input-bg border border-line rounded-card p-1"
		>
			@for (option of options(); track option.value) {
				<button
					type="button"
					class="flex items-center justify-center gap-1.5 px-2.5 py-1.5 max-sm:h-10 tap:min-h-[44px] tap:min-w-[44px] max-sm:px-3.5 rounded-md text-xs font-medium text-fg-muted cursor-pointer transition hover:text-fg bg-transparent border-0"
					[class.!bg-surface-hover]="value() === option.value"
					[class.!text-fg]="value() === option.value"
					[attr.aria-pressed]="value() === option.value"
					[title]="option.title ?? option.label + ' view'"
					(click)="value.set(option.value)"
				>
					<span aria-hidden="true" class="material-icons text-base">{{
						option.icon
					}}</span>
					<span class="max-lg:sr-only">{{ option.label }}</span>
				</button>
			}
		</div>
	`,
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ViewModeToggle<T extends string> {
	readonly options = input.required<readonly ViewModeOption<T>[]>();
	readonly value = model.required<T>();
}
