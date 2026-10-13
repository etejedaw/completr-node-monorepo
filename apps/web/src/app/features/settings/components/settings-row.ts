import { ChangeDetectionStrategy, Component, input } from "@angular/core";

@Component({
	selector: "app-settings-row",
	template: `
		<div class="flex items-start gap-3 min-w-0 md:w-56 lg:w-64 shrink-0">
			@if (icon()) {
				<span
					aria-hidden="true"
					class="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-md bg-input-bg"
					[class]="iconColor()"
				>
					<span class="material-icons text-lg">{{ icon() }}</span>
				</span>
			}
			<div class="min-w-0">
				@if (controlId(); as id) {
					<label
						class="block text-sm font-medium text-fg"
						[for]="id"
						>{{ label() }}</label
					>
				} @else {
					<span
						class="block text-sm font-medium text-fg"
						[id]="labelId()"
						>{{ label() }}</span
					>
				}
				@if (hint()) {
					<p class="m-0 mt-1 text-xs text-fg-muted leading-relaxed">
						{{ hint() }}
					</p>
				}
			</div>
		</div>
		<div class="flex-1 min-w-0">
			<ng-content />
		</div>
	`,
	host: {
		class: "flex flex-col md:flex-row md:items-start gap-3 md:gap-8 py-4 border-b border-line last:border-b-0"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsRow {
	readonly label = input.required<string>();
	readonly hint = input<string | null>(null);
	readonly controlId = input<string | null>(null);
	readonly labelId = input<string | null>(null);
	readonly icon = input<string | null>(null);
	readonly iconColor = input("text-fg-muted");
}
