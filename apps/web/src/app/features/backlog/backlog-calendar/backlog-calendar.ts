import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	input,
	output,
	signal
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { BacklogFilters, BacklogService } from "../backlog";
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
import { BacklogEntry, BacklogStatus } from "../../../core/models";
import { UiIconButton } from "../../../shared/ui";

interface BarSlot {
	entry: BacklogEntry;
	status: BacklogStatus;
	showTitle: boolean;
	roundLeft: boolean;
	roundRight: boolean;
}

interface CalendarLayout {
	slots: Map<string, (BarSlot | null)[]>;
	overflow: Map<string, number>;
}

interface WeekSegment {
	entry: BacklogEntry;
	status: BacklogStatus;
	segStart: Date;
	segEnd: Date;
	startsBeforeWeek: boolean;
	endsAfterWeek: boolean;
	lane: number;
}

const MAX_LANES = 3;

@Component({
	selector: "app-backlog-calendar",
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
	templateUrl: "./backlog-calendar.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogCalendar {
	readonly filters = input<BacklogFilters>({});
	readonly entryClick = output<BacklogEntry>();

	private readonly backlogService = inject(BacklogService);
	private readonly now = new Date();

	protected readonly focusedDate = signal(this.startOfDay(this.now));
	protected readonly entries = signal<BacklogEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly weekdayLabels = [
		"Mon",
		"Tue",
		"Wed",
		"Thu",
		"Fri",
		"Sat",
		"Sun"
	];

	private readonly loadEffect = effect(onCleanup => {
		const filters = this.filters();
		const focus = this.focusedDate();
		const monthStart = new Date(focus.getFullYear(), focus.getMonth(), 1);
		const gridStart = this.startOfWeekMonday(monthStart);
		const gridEnd = this.addDays(gridStart, 41);
		this.isLoading.set(true);
		const sub = this.backlogService
			.getMyBacklog({
				...filters,
				active_from: this.isoDate(gridStart),
				active_to: this.isoDate(gridEnd),
				limit: 100,
				offset: 0
			})
			.subscribe({
				next: res => {
					this.entries.set(res.data.backlog);
					this.isLoading.set(false);
				},
				error: () => this.isLoading.set(false)
			});
		onCleanup(() => sub.unsubscribe());
	});

	private readonly layout = computed<CalendarLayout>(() =>
		this.buildLayout(this.entries())
	);

	protected slotsFor(date: Date): (BarSlot | null)[] {
		return this.layout().slots.get(this.dateKey(date)) ?? [];
	}

	protected overflowFor(date: Date): number {
		return this.layout().overflow.get(this.dateKey(date)) ?? 0;
	}

	protected isToday(date: Date): boolean {
		return this.diffDays(date, this.now) === 0;
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

	barClass(status: BacklogStatus): string {
		const map: Record<BacklogStatus, string> = {
			not_started: "bg-fg-muted/15 text-fg-secondary",
			playing: "bg-warning/25 text-warning",
			completed: "bg-success/25 text-success",
			abandoned: "bg-danger/25 text-danger",
			endless: "bg-brand-subtle text-brand"
		};
		return map[status] ?? "";
	}

	private buildLayout(entries: BacklogEntry[]): CalendarLayout {
		const weeks = new Map<
			number,
			{ entry: BacklogEntry; start: Date; end: Date }[]
		>();
		for (const entry of entries) {
			const range = this.effectiveRange(entry);
			if (!range) continue;
			let wk = this.startOfWeekMonday(range.start);
			const lastWk = this.startOfWeekMonday(range.end);
			while (wk <= lastWk) {
				const key = wk.getTime();
				const bucket = weeks.get(key) ?? [];
				bucket.push({ entry, start: range.start, end: range.end });
				weeks.set(key, bucket);
				wk = this.addDays(wk, 7);
			}
		}

		const slots = new Map<string, (BarSlot | null)[]>();
		const overflow = new Map<string, number>();

		for (const [wkTime, items] of weeks) {
			const weekStart = new Date(wkTime);
			const weekEnd = this.addDays(weekStart, 6);
			const segments: WeekSegment[] = items.map(it => ({
				entry: it.entry,
				status: it.entry.status,
				segStart: it.start < weekStart ? weekStart : it.start,
				segEnd: it.end > weekEnd ? weekEnd : it.end,
				startsBeforeWeek: it.start < weekStart,
				endsAfterWeek: it.end > weekEnd,
				lane: 0
			}));
			this.assignLanes(segments);

			for (let i = 0; i < 7; i++) {
				const day = this.addDays(weekStart, i);
				const lanes: (BarSlot | null)[] = Array(MAX_LANES).fill(null);
				let over = 0;
				for (const seg of segments) {
					if (day < seg.segStart || day > seg.segEnd) continue;
					if (seg.lane >= MAX_LANES) {
						over++;
						continue;
					}
					const isStart = this.diffDays(day, seg.segStart) === 0;
					const isEnd = this.diffDays(day, seg.segEnd) === 0;
					lanes[seg.lane] = {
						entry: seg.entry,
						status: seg.status,
						showTitle: isStart,
						roundLeft: isStart && !seg.startsBeforeWeek,
						roundRight: isEnd && !seg.endsAfterWeek
					};
				}
				const key = this.dateKey(day);
				slots.set(key, lanes);
				if (over > 0) overflow.set(key, over);
			}
		}

		return { slots, overflow };
	}

	private assignLanes(segments: WeekSegment[]) {
		segments.sort(
			(a, b) =>
				a.segStart.getTime() - b.segStart.getTime() ||
				b.segEnd.getTime() -
					b.segStart.getTime() -
					(a.segEnd.getTime() - a.segStart.getTime())
		);
		const laneEnds: Date[] = [];
		for (const seg of segments) {
			let lane = 0;
			while (lane < laneEnds.length && laneEnds[lane] >= seg.segStart)
				lane++;
			seg.lane = lane;
			laneEnds[lane] = seg.segEnd;
		}
	}

	private effectiveRange(
		entry: BacklogEntry
	): { start: Date; end: Date } | null {
		const startIso = entry.startedAt ?? entry.finishedAt;
		if (!startIso) return null;
		const start = this.parseDateOnly(startIso);
		let end: Date;
		if (entry.finishedAt) {
			end = this.parseDateOnly(entry.finishedAt);
		} else if (entry.status === "playing" || entry.status === "endless") {
			end = this.startOfDay(this.now);
		} else {
			end = start;
		}
		if (end < start) end = start;
		return { start, end };
	}

	private dateKey(date: Date): string {
		return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
	}

	private isoDate(date: Date): string {
		const m = String(date.getMonth() + 1).padStart(2, "0");
		const d = String(date.getDate()).padStart(2, "0");
		return `${date.getFullYear()}-${m}-${d}`;
	}

	private parseDateOnly(iso: string): Date {
		const [y, m, d] = iso.split("T")[0].split("-").map(Number);
		return new Date(y, m - 1, d);
	}

	private startOfDay(date: Date): Date {
		return new Date(date.getFullYear(), date.getMonth(), date.getDate());
	}

	private addDays(date: Date, days: number): Date {
		const d = new Date(date);
		d.setDate(d.getDate() + days);
		return d;
	}

	private diffDays(a: Date, b: Date): number {
		return Math.round(
			(this.startOfDay(a).getTime() - this.startOfDay(b).getTime()) /
				86400000
		);
	}

	private startOfWeekMonday(date: Date): Date {
		const d = this.startOfDay(date);
		return this.addDays(d, -((d.getDay() + 6) % 7));
	}
}
