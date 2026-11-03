import { ChangeDetectionStrategy, Component, input } from "@angular/core";

const PRIVATE_RUN_LABEL = "Private run: only you can see it";

@Component({
	selector: "app-private-run-lock",
	template: `
		<span
			role="img"
			class="material-icons leading-none text-fg-muted"
			[class]="iconSizeClass()"
			[attr.aria-label]="label"
			[title]="label"
			>lock</span
		>
	`,
	host: { class: "inline-flex shrink-0" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrivateRunLock {
	readonly iconSizeClass = input("text-base");

	protected readonly label = PRIVATE_RUN_LABEL;
}
