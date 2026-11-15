import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	model,
	output,
	signal,
	viewChild
} from "@angular/core";
import { NgpDateRangePicker } from "ng-primitives/date-picker";
import { NgpPopover, NgpPopoverTrigger } from "ng-primitives/popover";

import { UiBottomSheet } from "../bottom-sheet/ui-bottom-sheet";
import { injectCalendarOpening } from "./calendar-opening";
import {
	clampDate,
	formatDateDisplay,
	formatDateValue,
	parseDateValue,
	startOfDay
} from "./date-picker-value";
import { UiCalendarPanel } from "./ui-calendar-panel";
import { UiDatePickerInitialFocus } from "./ui-date-picker-initial-focus";

@Component({
	selector: "ui-date-range-picker",
	imports: [
		NgTemplateOutlet,
		NgpDateRangePicker,
		NgpPopover,
		NgpPopoverTrigger,
		UiBottomSheet,
		UiCalendarPanel,
		UiDatePickerInitialFocus
	],
	templateUrl: "./ui-date-range-picker.html",
	host: { class: "block min-w-0" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiDateRangePicker {
	readonly start = model<string>("");
	readonly end = model<string>("");
	readonly label = input.required<string>();
	readonly triggerId = input<string | null>(null);
	readonly heading = input<string | null>(null);
	readonly placeholder = input<string | null>(null);
	readonly minDate = input<string | null | undefined>(null);
	readonly maxDate = input<string | null | undefined>(null);
	readonly disabled = input(false);
	readonly invalid = input(false);
	readonly describedBy = input<string | null>(null);
	readonly touch = output<void>();

	protected readonly opening = injectCalendarOpening({
		isDisabled: () => this.disabled(),
		prepare: () => this.prepareDraft(),
		closed: () => this.touch.emit()
	});
	protected readonly focusedDay = signal(startOfDay(new Date()));
	protected readonly draftStart = signal<Date | undefined>(undefined);
	protected readonly draftEnd = signal<Date | undefined>(undefined);

	protected readonly selectedStart = computed(() =>
		parseDateValue(this.start(), "date")
	);
	protected readonly selectedEnd = computed(() =>
		parseDateValue(this.end(), "date")
	);
	protected readonly minDay = computed(
		() => parseDateValue(this.minDate(), "date") ?? undefined
	);
	protected readonly maxDay = computed(
		() => parseDateValue(this.maxDate(), "date") ?? undefined
	);
	protected readonly displayText = computed(() => {
		const start = this.selectedStart();
		const end = this.selectedEnd();
		if (!start || !end) return null;
		return `${formatDateDisplay(start, "date")} – ${formatDateDisplay(end, "date")}`;
	});
	protected readonly placeholderText = computed(
		() => this.placeholder() ?? "Select dates"
	);
	protected readonly sheetHeading = computed(
		() => this.heading() ?? this.label()
	);
	protected readonly progressText = computed(() => {
		const start = this.draftStart();
		if (!start) return "Pick the first day.";
		if (!this.draftEnd())
			return `From ${formatDateDisplay(start, "date")}. Pick the last day.`;
		return this.displayText() ?? "";
	});
	protected readonly triggerLabel = computed(
		() => `${this.label()}: ${this.displayText() ?? this.placeholderText()}`
	);

	private readonly popoverTrigger = viewChild(NgpPopoverTrigger);

	protected onFocusedDayChange(date: Date) {
		this.focusedDay.set(startOfDay(date));
	}

	protected pickRangeStart(date: Date | undefined) {
		this.draftStart.set(date ? startOfDay(date) : undefined);
	}

	protected pickRangeEnd(date: Date | undefined) {
		this.draftEnd.set(date ? startOfDay(date) : undefined);
		const start = this.draftStart();
		if (!date || !start) return;
		this.commit(start, startOfDay(date));
	}

	private commit(start: Date, end: Date) {
		const min = this.minDay() ?? null;
		const max = this.maxDay() ?? null;
		const nextStart = formatDateValue(clampDate(start, min, max), "date");
		const nextEnd = formatDateValue(clampDate(end, min, max), "date");
		if (nextStart !== this.start()) this.start.set(nextStart);
		if (nextEnd !== this.end()) this.end.set(nextEnd);
		this.opening.closeSheet();
		void this.popoverTrigger()?.hide("keyboard");
	}

	private prepareDraft() {
		const start = this.selectedStart();
		const end = this.selectedEnd();
		const complete = !!start && !!end;
		this.draftStart.set(complete ? start : undefined);
		this.draftEnd.set(complete ? end : undefined);
		const fallback = clampDate(
			startOfDay(new Date()),
			this.minDay() ?? null,
			this.maxDay() ?? null
		);
		this.focusedDay.set(start ?? fallback);
	}
}
