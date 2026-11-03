import { NgTemplateOutlet } from "@angular/common";
import {
	afterNextRender,
	booleanAttribute,
	ChangeDetectionStrategy,
	Component,
	computed,
	Directive,
	ElementRef,
	inject,
	input,
	model,
	output,
	signal,
	viewChild
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
import { NgpPopover, NgpPopoverTrigger } from "ng-primitives/popover";

import { ViewportService } from "../../../core/services/viewport";
import { UiBottomSheet } from "../bottom-sheet/ui-bottom-sheet";
import { UiButton } from "../button/ui-button";
import { UiIconButton } from "../icon-button/ui-icon-button";
import {
	clampDate,
	formatDateDisplay,
	formatDateValue,
	formatDayLabel,
	formatMonthLabel,
	formatTwoDigits,
	isSameDay,
	parseDateValue,
	startOfDay,
	type UiDatePickerMode,
	withTime
} from "./date-picker-value";

export type { UiDatePickerMode } from "./date-picker-value";

const WEEKDAYS = [
	{ short: "S", full: "Sunday" },
	{ short: "M", full: "Monday" },
	{ short: "T", full: "Tuesday" },
	{ short: "W", full: "Wednesday" },
	{ short: "T", full: "Thursday" },
	{ short: "F", full: "Friday" },
	{ short: "S", full: "Saturday" }
];

const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const MINUTE_BUTTON_STEP = 5;
const MINUTE_PAGE_STEP = 10;
const HOUR_PAGE_STEP = 6;

type TimeUnit = "hours" | "minutes";

let nextDatePickerId = 0;

@Directive({ selector: "[uiDatePickerInitialFocus]" })
export class UiDatePickerInitialFocus {
	constructor() {
		const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
		afterNextRender({
			read: () =>
				host
					.querySelector<HTMLElement>('[data-day][tabindex="0"]')
					?.focus()
		});
	}
}

@Component({
	selector: "ui-date-picker",
	imports: [
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
		NgpPopover,
		NgpPopoverTrigger,
		UiBottomSheet,
		UiButton,
		UiIconButton,
		UiDatePickerInitialFocus
	],
	templateUrl: "./ui-date-picker.html",
	host: { class: "block min-w-0" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiDatePicker {
	readonly value = model<string>("");
	readonly label = input.required<string>();
	readonly mode = input<UiDatePickerMode>("date");
	readonly triggerId = input<string | null>(null);
	readonly heading = input<string | null>(null);
	readonly placeholder = input<string | null>(null);
	readonly minDate = input<string | null | undefined>(null);
	readonly maxDate = input<string | null | undefined>(null);
	readonly clearable = input(false, { transform: booleanAttribute });
	readonly disabled = input(false);
	readonly invalid = input(false);
	readonly touched = input<boolean | null>(null);
	readonly describedBy = input<string | null>(null);
	readonly touch = output<void>();

	protected readonly isMobile = inject(ViewportService).isMobile;
	protected readonly weekdays = WEEKDAYS;
	protected readonly sheetOpen = signal(false);
	protected readonly popoverOpen = signal(false);
	protected readonly focusedDay = signal(startOfDay(new Date()));
	protected readonly draftHours = signal(0);
	protected readonly draftMinutes = signal(0);
	protected readonly gridLabelId = `ui-date-picker-month-${nextDatePickerId++}`;
	private readonly popoverTrigger = viewChild(NgpPopoverTrigger);
	private readonly trigger =
		viewChild.required<ElementRef<HTMLButtonElement>>("trigger");

	protected readonly isDateTime = computed(() => this.mode() === "datetime");
	protected readonly selected = computed(() =>
		parseDateValue(this.value(), this.mode())
	);
	protected readonly minBound = computed(() =>
		parseDateValue(this.minDate(), this.mode())
	);
	protected readonly maxBound = computed(() =>
		parseDateValue(this.maxDate(), this.mode())
	);
	protected readonly minDay = computed(() => {
		const min = this.minBound();
		return min ? startOfDay(min) : undefined;
	});
	protected readonly maxDay = computed(() => {
		const max = this.maxBound();
		return max ? startOfDay(max) : undefined;
	});
	protected readonly isOpen = computed(
		() => this.sheetOpen() || this.popoverOpen()
	);
	protected readonly displayText = computed(() => {
		const selected = this.selected();
		return selected ? formatDateDisplay(selected, this.mode()) : null;
	});
	protected readonly placeholderText = computed(
		() =>
			this.placeholder() ??
			(this.isDateTime() ? "Select date and time" : "Select date")
	);
	protected readonly sheetHeading = computed(
		() => this.heading() ?? this.label()
	);
	protected readonly showInvalid = computed(
		() => this.invalid() && this.touched() !== false
	);
	protected readonly canClear = computed(
		() => this.clearable() && !!this.value() && !this.disabled()
	);
	protected readonly monthLabel = computed(() =>
		formatMonthLabel(this.focusedDay())
	);
	protected readonly todayDisabled = computed(() => {
		const today = startOfDay(new Date());
		const minDay = this.minDay();
		const maxDay = this.maxDay();
		return (!!minDay && today < minDay) || (!!maxDay && today > maxDay);
	});
	protected readonly hoursText = computed(() =>
		formatTwoDigits(this.draftHours())
	);
	protected readonly minutesText = computed(() =>
		formatTwoDigits(this.draftMinutes())
	);
	protected readonly triggerLabel = computed(
		() => `${this.label()}: ${this.displayText() ?? this.placeholderText()}`
	);

	focus(options?: FocusOptions) {
		this.trigger().nativeElement.focus(options);
	}

	protected openSheet() {
		if (this.disabled()) return;
		this.prepareDraft();
		if (this.isMobile()) this.sheetOpen.set(true);
	}

	protected onPopoverOpenChange(open: boolean) {
		this.popoverOpen.set(open);
		if (!open) this.touch.emit();
	}

	protected closeSheet() {
		if (!this.sheetOpen()) return;
		this.sheetOpen.set(false);
		this.touch.emit();
	}

	protected close() {
		this.closeSheet();
		void this.popoverTrigger()?.hide("keyboard");
	}

	protected dayLabel(date: Date) {
		const today = isSameDay(date, new Date()) ? ", today" : "";
		return formatDayLabel(date) + today;
	}

	protected onFocusedDayChange(date: Date) {
		this.focusedDay.set(startOfDay(date));
	}

	protected onDayPicked(date: Date | undefined) {
		if (!date) return;
		const day = startOfDay(date);
		if (this.isDateTime()) {
			this.commit(withTime(day, this.draftHours(), this.draftMinutes()));
			return;
		}
		this.commit(day);
		this.close();
	}

	protected pickToday() {
		const today = startOfDay(new Date());
		this.focusedDay.set(today);
		this.onDayPicked(today);
	}

	protected clear() {
		if (!this.value()) return;
		this.value.set("");
		this.touch.emit();
	}

	protected clearFromPanel() {
		this.clear();
		this.close();
	}

	protected stepTime(unit: TimeUnit, delta: number) {
		if (unit === "hours") {
			this.draftHours.update(hours => wrap(hours + delta, HOURS_PER_DAY));
		} else {
			this.draftMinutes.update(minutes =>
				wrap(minutes + delta, MINUTES_PER_HOUR)
			);
		}
		this.applyDraftTime();
	}

	protected stepMinutesByButton(direction: 1 | -1) {
		const minutes = this.draftMinutes();
		const remainder = minutes % MINUTE_BUTTON_STEP;
		const delta =
			direction > 0
				? MINUTE_BUTTON_STEP - remainder
				: -(remainder || MINUTE_BUTTON_STEP);
		this.stepTime("minutes", delta);
	}

	protected onTimeKeydown(event: KeyboardEvent, unit: TimeUnit) {
		const pageStep = unit === "hours" ? HOUR_PAGE_STEP : MINUTE_PAGE_STEP;
		const last = (unit === "hours" ? HOURS_PER_DAY : MINUTES_PER_HOUR) - 1;
		const current =
			unit === "hours" ? this.draftHours() : this.draftMinutes();
		const deltas: Record<string, number> = {
			ArrowUp: 1,
			ArrowDown: -1,
			PageUp: pageStep,
			PageDown: -pageStep,
			Home: -current,
			End: last - current
		};
		const delta = deltas[event.key];
		if (delta === undefined) return;
		event.preventDefault();
		this.stepTime(unit, delta);
	}

	private applyDraftTime() {
		const selected = this.selected();
		if (!selected) return;
		this.commit(withTime(selected, this.draftHours(), this.draftMinutes()));
	}

	private commit(date: Date) {
		const bounded = clampDate(
			date,
			this.isDateTime() ? this.minBound() : (this.minDay() ?? null),
			this.isDateTime() ? this.maxBound() : (this.maxDay() ?? null)
		);
		if (this.isDateTime()) {
			this.draftHours.set(bounded.getHours());
			this.draftMinutes.set(bounded.getMinutes());
		}
		const next = formatDateValue(bounded, this.mode());
		if (next !== this.value()) this.value.set(next);
	}

	private prepareDraft() {
		const selected = this.selected();
		const today = startOfDay(new Date());
		const fallback = clampDate(
			today,
			this.minDay() ?? null,
			this.maxDay() ?? null
		);
		this.focusedDay.set(selected ? startOfDay(selected) : fallback);
		this.draftHours.set(selected?.getHours() ?? 0);
		this.draftMinutes.set(selected?.getMinutes() ?? 0);
	}
}

function wrap(value: number, size: number) {
	return ((value % size) + size) % size;
}
