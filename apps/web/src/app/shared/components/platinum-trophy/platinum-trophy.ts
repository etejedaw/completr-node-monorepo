import { formatDate } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	LOCALE_ID
} from "@angular/core";

export type PlatinumTrophyScope = "game" | "run";

const PLATINUM_DATE_FORMAT = "MMM d, y";

@Component({
	selector: "app-platinum-trophy",
	template: `
		<span
			role="img"
			class="material-icons leading-none"
			[class]="[iconSizeClass(), toneClass()]"
			[attr.aria-label]="label()"
			[title]="label()"
			>emoji_events</span
		>
	`,
	host: { class: "inline-flex shrink-0" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlatinumTrophy {
	readonly scope = input<PlatinumTrophyScope>("game");
	readonly platinumedAt = input<string | null>(null);
	readonly iconSizeClass = input("text-base");

	private readonly locale = inject(LOCALE_ID);

	protected readonly toneClass = computed(() =>
		this.scope() === "run" ? "text-fg" : "text-fg-muted"
	);

	protected readonly label = computed(() => {
		const base =
			this.scope() === "run" ? "Platinumed in this run" : "Platinumed";
		const date = this.platinumedAt();
		return date
			? `${base} on ${formatDate(date, PLATINUM_DATE_FORMAT, this.locale)}`
			: base;
	});
}
