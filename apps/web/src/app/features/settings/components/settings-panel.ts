import { ChangeDetectionStrategy, Component, input } from "@angular/core";

@Component({
	selector: "app-settings-panel",
	template: `
		<section
			class="rounded-card border border-line bg-surface"
			[attr.aria-labelledby]="headingId()"
		>
			<header
				class="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-line"
			>
				<div class="min-w-0">
					<h2
						class="m-0 font-display text-base sm:text-lg font-semibold text-fg"
						[id]="headingId()"
					>
						{{ heading() }}
					</h2>
					@if (description()) {
						<p class="m-0 mt-1 text-sm text-fg-muted">
							{{ description() }}
						</p>
					}
				</div>
				<ng-content select="[panelActions]" />
			</header>
			<div class="px-5 py-2">
				<ng-content />
			</div>
		</section>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPanel {
	readonly heading = input.required<string>();
	readonly headingId = input.required<string>();
	readonly description = input<string | null>(null);
}
