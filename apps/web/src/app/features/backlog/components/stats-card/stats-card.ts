import { ChangeDetectionStrategy, Component, input } from "@angular/core";

let nextStatsCardId = 0;

@Component({
	selector: "app-stats-card",
	template: `
		<section
			class="h-full flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
			[attr.aria-labelledby]="headingId"
		>
			<header class="flex items-baseline justify-between gap-3">
				<h3
					class="m-0 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-fg-muted"
					[id]="headingId"
				>
					{{ label() }}
				</h3>
				@if (meta()) {
					<span class="text-[0.6875rem] text-fg-muted tabular-nums">{{
						meta()
					}}</span>
				}
			</header>
			<ng-content />
		</section>
	`,
	host: { class: "block min-w-0" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatsCard {
	readonly label = input.required<string>();
	readonly meta = input<string | null>(null);

	protected readonly headingId = `stats-card-${nextStatsCardId++}`;
}
