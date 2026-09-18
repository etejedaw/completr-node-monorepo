import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	input,
	output,
	signal,
	untracked
} from "@angular/core";
import {
	NgpDatePicker,
	NgpDatePickerCell,
	NgpDatePickerCellRender,
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

import { type GameShelfEntry } from "../../../core/models";
import { UiIconButton } from "../../../shared/ui";

const MAX_CHIPS = 3;
const MAX_DOTS = 4;

@Component({
	selector: "app-game-shelf-calendar",
	imports: [
		DatePipe,
		NgpDatePicker,
		NgpDatePickerCell,
		NgpDatePickerCellRender,
		NgpDatePickerGrid,
		NgpDatePickerLabel,
		NgpDatePickerNextMonth,
		NgpDatePickerPreviousMonth,
		NgpDatePickerRowRender,
		UiIconButton
	],
	providers: [provideDateAdapter(NgpNativeDateAdapter)],
	templateUrl: "./game-shelf-calendar.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameShelfCalendar {
	readonly entries = input<GameShelfEntry[]>([]);
	readonly entryClick = output<GameShelfEntry>();

	private readonly now = new Date();

	protected readonly focusedDate = signal(this.startOfDay(this.now));
	protected readonly selectedDay = signal<Date | null>(null);
	protected readonly maxChips = MAX_CHIPS;
	protected readonly weekdayLabels = [
		"Mon",
		"Tue",
		"Wed",
		"Thu",
		"Fri",
		"Sat",
		"Sun"
	];

	private autoPositioned = false;

	private readonly autoPositionEffect = effect(() => {
		const list = this.entries();
		if (this.autoPositioned || list.length === 0) return;
		const latest = this.latestAcquiredMonth(list);
		untracked(() => {
			if (latest) this.focusedDate.set(latest);
		});
		this.autoPositioned = true;
	});

	private readonly byDay = computed<Map<string, GameShelfEntry[]>>(() => {
		const map = new Map<string, GameShelfEntry[]>();
		for (const entry of this.entries()) {
			if (!entry.acquiredAt) continue;
			const key = this.dateKey(this.parseDateOnly(entry.acquiredAt));
			const bucket = map.get(key) ?? [];
			bucket.push(entry);
			map.set(key, bucket);
		}
		for (const bucket of map.values()) {
			bucket.sort((a, b) => a.game.title.localeCompare(b.game.title));
		}
		return map;
	});

	protected readonly undatedCount = computed(
		() => this.entries().filter(e => !e.acquiredAt).length
	);

	protected itemsForDay(date: Date): GameShelfEntry[] {
		return this.byDay().get(this.dateKey(date)) ?? [];
	}

	protected overflowFor(date: Date): number {
		return Math.max(0, this.itemsForDay(date).length - MAX_CHIPS);
	}

	protected selectedDayItems(): GameShelfEntry[] {
		const day = this.selectedDay();
		return day ? this.itemsForDay(day) : [];
	}

	protected readonly maxDots = MAX_DOTS;

	protected isToday(date: Date): boolean {
		return this.diffDays(date, this.now) === 0;
	}

	protected isWeekend(date: Date): boolean {
		const day = date.getDay();
		return day === 0 || day === 6;
	}

	protected isOutsideMonth(date: Date): boolean {
		const focus = this.focusedDate();
		return (
			date.getMonth() !== focus.getMonth() ||
			date.getFullYear() !== focus.getFullYear()
		);
	}

	goToday() {
		this.focusedDate.set(this.startOfDay(this.now));
	}

	openDay(date: Date) {
		this.selectedDay.set(date);
	}

	closeDay() {
		this.selectedDay.set(null);
	}

	selectItem(entry: GameShelfEntry) {
		this.selectedDay.set(null);
		this.entryClick.emit(entry);
	}

	private latestAcquiredMonth(entries: GameShelfEntry[]): Date | null {
		let latest: Date | null = null;
		for (const entry of entries) {
			if (!entry.acquiredAt) continue;
			const date = this.parseDateOnly(entry.acquiredAt);
			if (!latest || date > latest) latest = date;
		}
		return latest
			? new Date(latest.getFullYear(), latest.getMonth(), 1)
			: null;
	}

	private dateKey(date: Date): string {
		return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
	}

	private parseDateOnly(iso: string): Date {
		const [y, m, d] = iso.split("T")[0].split("-").map(Number);
		return new Date(y, m - 1, d);
	}

	private startOfDay(date: Date): Date {
		return new Date(date.getFullYear(), date.getMonth(), date.getDate());
	}

	private diffDays(a: Date, b: Date): number {
		return Math.round(
			(this.startOfDay(a).getTime() - this.startOfDay(b).getTime()) /
				86400000
		);
	}
}
