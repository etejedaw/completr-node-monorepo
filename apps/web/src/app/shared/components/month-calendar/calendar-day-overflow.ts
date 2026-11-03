import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";

export type CalendarDayOverflowTone = "brand" | "platinum";

const HOVER_CLASSES: Record<CalendarDayOverflowTone, string> = {
	brand: "hover:text-brand",
	platinum: "hover:text-platinum"
};

@Component({
	selector: "app-calendar-day-overflow",
	template: `
		<button
			type="button"
			class="px-1.5 text-[0.625rem] font-medium text-fg-muted leading-none bg-transparent border-0 cursor-pointer"
			[class]="hoverClass()"
			(click)="pressed.emit()"
		>
			+{{ count() }} more
		</button>
	`,
	host: { class: "self-start" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarDayOverflow {
	readonly count = input.required<number>();
	readonly tone = input<CalendarDayOverflowTone>("brand");
	readonly pressed = output();

	protected readonly hoverClass = computed(() => HOVER_CLASSES[this.tone()]);
}
