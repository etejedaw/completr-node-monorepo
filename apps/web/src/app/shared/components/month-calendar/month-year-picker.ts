import { DatePipe, NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	output,
	signal,
	viewChild
} from "@angular/core";
import { NgpPopover, NgpPopoverTrigger } from "ng-primitives/popover";

import { ViewportService } from "../../../core/services/viewport";
import { UiBottomSheet } from "../../ui";
import { ChipGroup, type ChipOption } from "../chip-group/chip-group";

const YEARS_BEFORE_TODAY = 4;
const YEARS_AFTER_TODAY = 1;

const MONTHS = [
	{ short: "Jan", full: "January" },
	{ short: "Feb", full: "February" },
	{ short: "Mar", full: "March" },
	{ short: "Apr", full: "April" },
	{ short: "May", full: "May" },
	{ short: "Jun", full: "June" },
	{ short: "Jul", full: "July" },
	{ short: "Aug", full: "August" },
	{ short: "Sep", full: "September" },
	{ short: "Oct", full: "October" },
	{ short: "Nov", full: "November" },
	{ short: "Dec", full: "December" }
];

@Component({
	selector: "app-month-year-picker",
	imports: [
		DatePipe,
		NgTemplateOutlet,
		NgpPopover,
		NgpPopoverTrigger,
		ChipGroup,
		UiBottomSheet
	],
	templateUrl: "./month-year-picker.html",
	host: { class: "inline-block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class MonthYearPicker {
	readonly month = input.required<Date>();
	readonly minYear = input<number | null>(null);
	readonly maxYear = input<number | null>(null);
	readonly monthChosen = output<Date>();

	protected readonly isMobile = inject(ViewportService).isMobile;
	protected readonly sheetOpen = signal(false);
	protected readonly months = MONTHS;
	private readonly popoverTrigger = viewChild(NgpPopoverTrigger);
	private readonly currentYear = new Date().getFullYear();

	protected readonly shownYear = computed(() => this.month().getFullYear());
	protected readonly shownMonthIndex = computed(() =>
		this.month().getMonth()
	);
	protected readonly selectedYearValue = computed(() => [
		String(this.shownYear())
	]);

	protected readonly yearOptions = computed<ChipOption[]>(() => {
		const shown = this.shownYear();
		const first = Math.min(
			this.minYear() ?? this.currentYear - YEARS_BEFORE_TODAY,
			shown
		);
		const last = Math.max(
			this.maxYear() ?? this.currentYear + YEARS_AFTER_TODAY,
			shown
		);
		return Array.from({ length: last - first + 1 }, (_, offset) => {
			const year = String(first + offset);
			return { value: year, label: year };
		});
	});

	protected openSheet() {
		if (this.isMobile()) this.sheetOpen.set(true);
	}

	protected chooseYear(values: readonly string[]) {
		const year = Number(values[0]);
		if (!year || year === this.shownYear()) return;
		this.emitMonth(year, this.shownMonthIndex());
	}

	protected chooseMonth(monthIndex: number) {
		this.emitMonth(this.shownYear(), monthIndex);
		this.sheetOpen.set(false);
		this.popoverTrigger()?.hide("program");
	}

	private emitMonth(year: number, monthIndex: number) {
		const lastDay = new Date(year, monthIndex + 1, 0).getDate();
		const day = Math.min(this.month().getDate(), lastDay);
		this.monthChosen.emit(new Date(year, monthIndex, day));
	}
}
