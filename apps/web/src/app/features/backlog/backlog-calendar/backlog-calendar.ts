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
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { forkJoin } from "rxjs";

import { type BacklogEntry, type BacklogStatus } from "../../../core/models";
import {
	type CalendarAgendaItem,
	CalendarDayTemplate,
	MonthCalendar,
	sameTime,
	shortDate,
	startOfMonth
} from "../../../shared/components/month-calendar/month-calendar";
import {
	backlogStatusCalendarBarClass,
	backlogStatusFillClass,
	backlogStatusLabel
} from "../../../shared/utils/backlog-status";
import { type BacklogFilters, BacklogService } from "../backlog";

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
	dayEntries: Map<string, BacklogEntry[]>;
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

interface DateRange {
	start: Date;
	end: Date;
}

const MAX_LANES = 3;
const MONTH_LIMIT = 100;

@Component({
	selector: "app-backlog-calendar",
	imports: [MonthCalendar, CalendarDayTemplate],
	templateUrl: "./backlog-calendar.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogCalendar {
	readonly filters = input<BacklogFilters>({});
	readonly entryClick = output<BacklogEntry>();
	readonly viewUnscheduled = output<void>();

	private readonly backlogService = inject(BacklogService);
	private readonly now = new Date();

	protected readonly focusedDate = signal(this.startOfDay(this.now));
	protected readonly selectedDay = signal<Date | null>(null);
	private readonly monthStart = computed(
		() => startOfMonth(this.focusedDate()),
		{ equal: sameTime }
	);
	protected readonly entries = signal<BacklogEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly earliestYear = signal<number | null>(null);
	protected readonly unscheduledCount = signal(0);
	protected readonly monthTotal = signal(0);
	protected readonly monthLimit = MONTH_LIMIT;
	protected readonly isTruncated = computed(
		() => this.monthTotal() > MONTH_LIMIT
	);
	protected readonly hiddenStatuses = signal<Set<BacklogStatus>>(new Set());
	protected readonly legendItems: { status: BacklogStatus; dot: string }[] = [
		{ status: "playing", dot: "bg-playing" },
		{ status: "completed", dot: "bg-success" },
		{ status: "abandoned", dot: "bg-danger" },
		{ status: "endless", dot: "bg-brand" }
	];

	private readonly earliestYearSubscription = forkJoin([
		this.backlogService.getMyBacklog({
			sort_by: "startedAt",
			sort_order: "asc",
			limit: 1,
			offset: 0
		}),
		this.backlogService.getMyBacklog({
			sort_by: "finishedAt",
			sort_order: "asc",
			limit: 1,
			offset: 0
		})
	])
		.pipe(takeUntilDestroyed())
		.subscribe({
			next: ([byStart, byFinish]) => {
				const years = [
					byStart.data.backlog[0]?.startedAt,
					byFinish.data.backlog[0]?.finishedAt
				]
					.filter((iso): iso is string => !!iso)
					.map(iso => this.parseDateOnly(iso).getFullYear());
				this.earliestYear.set(
					years.length > 0 ? Math.min(...years) : null
				);
			}
		});

	private readonly loadEffect = effect(onCleanup => {
		const filters = this.filters();
		const monthStart = this.monthStart();
		const gridStart = this.startOfWeekMonday(monthStart);
		const gridEnd = this.addDays(gridStart, 41);
		this.isLoading.set(true);
		const sub = this.backlogService
			.getMyBacklog({
				...filters,
				active_from: this.isoDate(gridStart),
				active_to: this.isoDate(gridEnd),
				limit: MONTH_LIMIT,
				offset: 0
			})
			.subscribe({
				next: res => {
					this.entries.set(res.data.backlog);
					this.monthTotal.set(res.data.total);
					this.isLoading.set(false);
				},
				error: () => this.isLoading.set(false)
			});
		onCleanup(() => sub.unsubscribe());
	});

	private readonly unscheduledEffect = effect(onCleanup => {
		const filters = this.filters();
		const sub = this.backlogService
			.getMyBacklog({ ...filters, undated: true, limit: 1, offset: 0 })
			.subscribe({
				next: res => this.unscheduledCount.set(res.data.total),
				error: () => this.unscheduledCount.set(0)
			});
		onCleanup(() => sub.unsubscribe());
	});

	private readonly visibleEntries = computed(() => {
		const hidden = this.hiddenStatuses();
		return hidden.size === 0
			? this.entries()
			: this.entries().filter(e => !hidden.has(e.status));
	});

	private readonly layout = computed<CalendarLayout>(() =>
		this.buildLayout(this.visibleEntries())
	);

	protected readonly monthEntries = computed(() => {
		const monthStart = this.monthStart();
		const monthEnd = new Date(
			monthStart.getFullYear(),
			monthStart.getMonth() + 1,
			0
		);
		return this.visibleEntries()
			.map(entry => ({ entry, range: this.effectiveRange(entry) }))
			.filter(
				(item): item is { entry: BacklogEntry; range: DateRange } =>
					!!item.range &&
					item.range.start <= monthEnd &&
					item.range.end >= monthStart
			)
			.sort((a, b) => a.range.start.getTime() - b.range.start.getTime())
			.map(item => item.entry);
	});

	protected readonly agendaItems = computed<CalendarAgendaItem[]>(() => {
		const day = this.selectedDay();
		const entries = day
			? (this.layout().dayEntries.get(this.dateKey(day)) ?? [])
			: this.monthEntries();
		return entries.map(entry => ({
			id: entry.id,
			title: entry.game.title,
			posterSrc: entry.game.backgroundUrl,
			meta: `${backlogStatusLabel(entry.status)} · ${entry.platform.abbreviation}`,
			dotClass: backlogStatusFillClass(entry.status),
			dateLabel: this.rangeLabel(entry)
		}));
	});

	protected readonly markersFor = (date: Date): string[] =>
		(this.layout().dayEntries.get(this.dateKey(date)) ?? []).map(entry =>
			backlogStatusFillClass(entry.status)
		);

	protected slotsFor(date: Date): (BarSlot | null)[] {
		return this.layout().slots.get(this.dateKey(date)) ?? [];
	}

	protected overflowFor(date: Date): number {
		return this.layout().overflow.get(this.dateKey(date)) ?? 0;
	}

	protected readonly barClass = backlogStatusCalendarBarClass;

	isStatusHidden(status: BacklogStatus): boolean {
		return this.hiddenStatuses().has(status);
	}

	protected statusLabel(status: BacklogStatus): string {
		return backlogStatusLabel(status);
	}

	protected selectDay(date: Date) {
		this.selectedDay.set(date);
	}

	protected openEntry(id: string) {
		const entry = this.entries().find(item => item.id === id);
		if (entry) this.entryClick.emit(entry);
	}

	toggleStatus(status: BacklogStatus) {
		const next = new Set(this.hiddenStatuses());
		if (next.has(status)) next.delete(status);
		else next.add(status);
		this.hiddenStatuses.set(next);
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
		const dayEntries = new Map<string, BacklogEntry[]>();

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
				const covering: BacklogEntry[] = [];
				let over = 0;
				for (const seg of segments) {
					if (day < seg.segStart || day > seg.segEnd) continue;
					covering.push(seg.entry);
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
				if (covering.length > 0) dayEntries.set(key, covering);
			}
		}

		return { slots, overflow, dayEntries };
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

	private rangeLabel(entry: BacklogEntry): string {
		const range = this.effectiveRange(entry);
		if (!range) return "";
		if (!entry.finishedAt && entry.status === "playing")
			return `Since ${shortDate(range.start)}`;
		if (this.diffDays(range.end, range.start) === 0)
			return shortDate(range.start);
		return `${shortDate(range.start)} – ${shortDate(range.end)}`;
	}

	private effectiveRange(entry: BacklogEntry): DateRange | null {
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
