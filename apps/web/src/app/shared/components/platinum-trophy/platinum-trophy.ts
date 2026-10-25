import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

export type PlatinumTrophyScope = "game" | "run";

@Component({
	selector: "app-platinum-trophy",
	imports: [DatePipe],
	template: `
		@if (scope() === "run") {
			<span
				class="inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5 rounded-full border border-line bg-surface-hover text-fg-secondary text-[0.6875rem] font-semibold tracking-wide"
			>
				<span aria-hidden="true" class="material-icons text-[0.875rem]"
					>emoji_events</span
				>
				@if (platinumedAt(); as date) {
					Platinumed on {{ date | date: "MMM d, y" }}
				} @else {
					Platinumed
				}
			</span>
		} @else {
			<span
				role="img"
				aria-label="Platinumed"
				title="Platinumed"
				class="material-icons text-fg-secondary leading-none"
				[class]="iconSizeClass()"
				>emoji_events</span
			>
		}
	`,
	host: { class: "inline-flex shrink-0" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlatinumTrophy {
	readonly scope = input<PlatinumTrophyScope>("game");
	readonly platinumedAt = input<string | null>(null);
	readonly iconSizeClass = input("text-base");
}
