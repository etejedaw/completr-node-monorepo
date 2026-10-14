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

import { type GameShelfEntry } from "../../../core/models";
import {
	type CalendarAgendaItem,
	CalendarDayTemplate,
	isSameMonth,
	MonthCalendar,
	shortDate
} from "../../../shared/components/month-calendar/month-calendar";

const MAX_CHIPS = 3;
const ACQUIRED_DOT = "bg-brand";

@Component({
	selector: "app-game-shelf-calendar",
	imports: [MonthCalendar, CalendarDayTemplate],
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

	protected readonly earliestYear = computed<number | null>(() => {
		let earliest: number | null = null;
		for (const entry of this.entries()) {
			if (!entry.acquiredAt) continue;
			const year = this.parseDateOnly(entry.acquiredAt).getFullYear();
			if (earliest === null || year < earliest) earliest = year;
		}
		return earliest;
	});

	protected readonly undatedCount = computed(
		() => this.entries().filter(e => !e.acquiredAt).length
	);

	protected readonly monthEntries = computed(() => {
		const focus = this.focusedDate();
		return this.entries()
			.filter(
				entry =>
					!!entry.acquiredAt &&
					isSameMonth(this.parseDateOnly(entry.acquiredAt), focus)
			)
			.sort(
				(a, b) =>
					this.parseDateOnly(a.acquiredAt!).getTime() -
						this.parseDateOnly(b.acquiredAt!).getTime() ||
					a.game.title.localeCompare(b.game.title)
			);
	});

	protected readonly agendaItems = computed<CalendarAgendaItem[]>(() => {
		const day = this.selectedDay();
		const entries = day ? this.itemsForDay(day) : this.monthEntries();
		return entries.map(entry => ({
			id: entry.id,
			title: entry.game.title,
			posterSrc: entry.game.backgroundUrl,
			meta: entry.edition
				? `${entry.platform.abbreviation} · ${entry.edition}`
				: entry.platform.abbreviation,
			dotClass: ACQUIRED_DOT,
			dateLabel: shortDate(this.parseDateOnly(entry.acquiredAt!))
		}));
	});

	protected readonly markersFor = (date: Date): string[] =>
		this.itemsForDay(date).map(() => ACQUIRED_DOT);

	protected itemsForDay(date: Date): GameShelfEntry[] {
		return this.byDay().get(this.dateKey(date)) ?? [];
	}

	protected overflowFor(date: Date): number {
		return Math.max(0, this.itemsForDay(date).length - MAX_CHIPS);
	}

	protected selectDay(date: Date) {
		this.selectedDay.set(date);
	}

	protected openEntry(id: string) {
		const entry = this.entries().find(item => item.id === id);
		if (entry) this.entryClick.emit(entry);
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
}
