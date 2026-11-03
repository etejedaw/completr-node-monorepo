import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";

@Component({
	selector: "app-calendar-event-chip",
	template: `
		<button
			type="button"
			class="-mx-px h-[18px] w-[calc(100%+2px)] flex items-center gap-1 px-1.5 border-0 text-[0.6875rem] font-medium leading-none truncate cursor-pointer transition hover:brightness-110"
			[class]="toneClass()"
			[class.rounded-l]="roundLeft()"
			[class.rounded-r]="roundRight()"
			[attr.title]="title()"
			[attr.aria-label]="ariaLabel()"
			[attr.tabindex]="showTitle() ? null : -1"
			(click)="pressed.emit()"
		>
			<ng-content />
			<span class="truncate">{{ showTitle() ? title() : "" }}</span>
		</button>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarEventChip {
	readonly title = input.required<string>();
	readonly toneClass = input("");
	readonly ariaLabel = input<string | null>(null);
	readonly showTitle = input(true);
	readonly roundLeft = input(true);
	readonly roundRight = input(true);
	readonly pressed = output();
}
