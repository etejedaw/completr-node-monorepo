import { DatePipe, formatDate, NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	contentChild,
	Directive,
	inject,
	input,
	model,
	output,
	TemplateRef
} from "@angular/core";
import {
	NgpDatePicker,
	NgpDatePickerCell,
	NgpDatePickerCellRender,
	NgpDatePickerDateButton,
	NgpDatePickerGrid,
	NgpDatePickerLabel,
	NgpDatePickerNextMonth,
	NgpDatePickerPreviousMonth,
	NgpDatePickerRowRender
} from "ng-primitives/date-picker";
import {
	NgpNativeDateAdapter,
	provideDateAdapter
} from "ng-primitives/date-time";

import { UiButton, UiIconButton } from "../../ui";
import { GamePoster } from "../game-poster/game-poster";
import {
	type CalendarAgendaItem,
	type CalendarDayContext
} from "./month-calendar.model";
import { MonthYearPicker } from "./month-year-picker";

const MAX_DOTS = 4;

const WEEKDAYS = [
	{ short: "Mon", full: "Monday" },
	{ short: "Tue", full: "Tuesday" },
	{ short: "Wed", full: "Wednesday" },
	{ short: "Thu", full: "Thursday" },
	{ short: "Fri", full: "Friday" },
	{ short: "Sat", full: "Saturday" },
	{ short: "Sun", full: "Sunday" }
];

@Directive({ selector: "ng-template[appCalendarDay]" })
export class CalendarDayTemplate {
	readonly template = inject<TemplateRef<CalendarDayContext>>(TemplateRef);

	static ngTemplateContextGuard(
		_directive: CalendarDayTemplate,
		_context: unknown
	): _context is CalendarDayContext {
		return true;
	}
}

export function startOfMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function isSameMonth(a: Date, b: Date): boolean {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function sameTime(a: Date, b: Date): boolean {
	return a.getTime() === b.getTime();
}

export function shortDate(date: Date): string {
	return formatDate(date, "MMM d", "en-US");
}

@Component({
	selector: "app-month-calendar",
	imports: [
		DatePipe,
		NgTemplateOutlet,
		NgpDatePicker,
		NgpDatePickerCell,
		NgpDatePickerCellRender,
		NgpDatePickerDateButton,
		NgpDatePickerGrid,
		NgpDatePickerLabel,
		NgpDatePickerNextMonth,
		NgpDatePickerPreviousMonth,
		NgpDatePickerRowRender,
		GamePoster,
		MonthYearPicker,
		UiButton,
		UiIconButton
	],
	providers: [provideDateAdapter(NgpNativeDateAdapter)],
	templateUrl: "./month-calendar.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class MonthCalendar {
	readonly month = model.required<Date>();
	readonly selected = model<Date | null>(null);
	readonly loading = input(false);
	readonly markersFor = input.required<(date: Date) => string[]>();
	readonly agendaItems = input.required<CalendarAgendaItem[]>();
	readonly minYear = input<number | null>(null);
	readonly maxYear = input<number | null>(null);
	readonly itemNoun = input("game");
	readonly emptyMonthHint = input("Nothing on the calendar this month.");
	readonly itemSelected = output<string>();

	protected readonly dayTemplate = contentChild(CalendarDayTemplate);
	protected readonly weekdays = WEEKDAYS;
	protected readonly maxDots = MAX_DOTS;
	private readonly today = new Date();

	protected readonly isCurrentMonth = computed(() =>
		isSameMonth(this.month(), this.today)
	);

	protected readonly agendaCount = computed(() => this.agendaItems().length);

	protected changeMonth(date: Date) {
		this.month.set(date);
		const selected = this.selected();
		if (selected && !isSameMonth(selected, date)) this.selected.set(null);
	}

	protected selectDay(date: Date | undefined) {
		this.selected.set(date ?? null);
	}

	protected showWholeMonth() {
		this.selected.set(null);
	}

	protected goToday() {
		this.changeMonth(
			new Date(
				this.today.getFullYear(),
				this.today.getMonth(),
				this.today.getDate()
			)
		);
	}

	protected nounFor(count: number) {
		return count === 1 ? this.itemNoun() : this.itemNoun() + "s";
	}

	protected dayLabel(date: Date, count: number) {
		const day = formatDate(date, "EEEE, MMMM d", "en-US");
		return count > 0 ? `${day}, ${count} ${this.nounFor(count)}` : day;
	}

	protected isToday(date: Date) {
		return (
			date.getFullYear() === this.today.getFullYear() &&
			date.getMonth() === this.today.getMonth() &&
			date.getDate() === this.today.getDate()
		);
	}

	protected isOutsideMonth(date: Date) {
		return !isSameMonth(date, this.month());
	}

	protected isWeekend(date: Date) {
		const day = date.getDay();
		return day === 0 || day === 6;
	}
}
