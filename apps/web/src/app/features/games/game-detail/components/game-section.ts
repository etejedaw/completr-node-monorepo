import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { UiBadge } from "../../../../shared/ui";

@Component({
	selector: "app-game-section",
	imports: [UiBadge],
	template: `
		<header class="flex items-end justify-between gap-3 mb-4">
			<div class="min-w-0">
				<h2
					[id]="sectionId() + '-heading'"
					class="m-0 flex items-center gap-2 font-display text-xl sm:text-2xl font-semibold text-fg"
				>
					{{ heading() }}
					@if (count() !== null) {
						<ui-badge tone="muted" class="font-sans tabular-nums">{{
							count()
						}}</ui-badge>
					}
				</h2>
				@if (subheading()) {
					<p class="m-0 mt-1 text-sm text-fg-muted">
						{{ subheading() }}
					</p>
				}
			</div>
			<div class="flex items-center gap-1 shrink-0">
				<ng-content select="[sectionActions]" />
			</div>
		</header>
		<ng-content />
	`,
	host: {
		class: "block scroll-mt-[calc(var(--topbar-height)+4.5rem)]",
		role: "region",
		"[id]": "sectionId()",
		"[attr.aria-labelledby]": "sectionId() + '-heading'"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameSection {
	readonly sectionId = input.required<string>();
	readonly heading = input.required<string>();
	readonly count = input<number | null>(null);
	readonly subheading = input<string | null>(null);
}
