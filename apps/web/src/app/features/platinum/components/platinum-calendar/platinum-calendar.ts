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

import { type PlatinumEntry } from "../../../../core/models";
import {
	type CalendarAgendaItem,
	CalendarDayTemplate,
	isSameMonth,
	MonthCalendar,
	shortDate
} from "../../../../shared/components/month-calendar/month-calendar";

const MAX_CHIPS = 3;
const PLATINUM_DOT = "bg-platinum";

type DatedPlatinum = PlatinumEntry & { platinumedAt: string };

function parseDateOnly(iso: string): Date {
	const [year, month, day] = iso.split("T")[0].split("-").map(Number);
	return new Date(year, month - 1, day);
}

function dateKey(date: Date): string {
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function isDated(platinum: PlatinumEntry): platinum is DatedPlatinum {
	return !!platinum.platinumedAt;
}

@Component({
	selector: "app-platinum-calendar",
	imports: [MonthCalendar, CalendarDayTemplate],
	templateUrl: "./platinum-calendar.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlatinumCalendar {
	readonly platinums = input<PlatinumEntry[]>([]);
	readonly emptyMonthHint = input("No platinums this month.");
	readonly platinumClick = output<PlatinumEntry>();

	private readonly today = new Date();

	protected readonly focusedDate = signal(
		new Date(this.today.getFullYear(), this.today.getMonth(), 1)
	);
	protected readonly selectedDay = signal<Date | null>(null);
	protected readonly maxChips = MAX_CHIPS;

	private autoPositioned = false;

	private readonly datedPlatinums = computed(() =>
		this.platinums().filter(isDated)
	);

	private readonly autoPositionEffect = effect(() => {
		const latest = this.latestPlatinumMonth();
		if (this.autoPositioned || !latest) return;
		untracked(() => this.focusedDate.set(latest));
		this.autoPositioned = true;
	});

	private readonly byDay = computed(() => {
		const days = new Map<string, DatedPlatinum[]>();
		for (const platinum of this.datedPlatinums()) {
			const key = dateKey(parseDateOnly(platinum.platinumedAt));
			days.set(key, [...(days.get(key) ?? []), platinum]);
		}
		for (const bucket of days.values())
			bucket.sort((a, b) => a.game.title.localeCompare(b.game.title));
		return days;
	});

	protected readonly earliestYear = computed<number | null>(() => {
		const years = this.datedPlatinums().map(platinum =>
			parseDateOnly(platinum.platinumedAt).getFullYear()
		);
		return years.length > 0 ? Math.min(...years) : null;
	});

	protected readonly undatedCount = computed(
		() => this.platinums().length - this.datedPlatinums().length
	);

	protected readonly monthPlatinums = computed(() => {
		const focus = this.focusedDate();
		return this.datedPlatinums()
			.filter(platinum =>
				isSameMonth(parseDateOnly(platinum.platinumedAt), focus)
			)
			.sort(
				(a, b) =>
					parseDateOnly(a.platinumedAt).getTime() -
						parseDateOnly(b.platinumedAt).getTime() ||
					a.game.title.localeCompare(b.game.title)
			);
	});

	protected readonly agendaItems = computed<CalendarAgendaItem[]>(() => {
		const day = this.selectedDay();
		const platinums = day
			? this.platinumsForDay(day)
			: this.monthPlatinums();
		return platinums.map(platinum => ({
			id: platinum.id,
			title: platinum.game.title,
			posterSrc: platinum.game.backgroundUrl,
			meta: platinum.platform?.abbreviation ?? "Platinum",
			dotClass: PLATINUM_DOT,
			dateLabel: shortDate(parseDateOnly(platinum.platinumedAt))
		}));
	});

	protected readonly markersFor = (date: Date): string[] =>
		this.platinumsForDay(date).map(() => PLATINUM_DOT);

	protected platinumsForDay(date: Date): DatedPlatinum[] {
		return this.byDay().get(dateKey(date)) ?? [];
	}

	protected overflowFor(date: Date): number {
		return Math.max(0, this.platinumsForDay(date).length - MAX_CHIPS);
	}

	protected selectDay(date: Date) {
		this.selectedDay.set(date);
	}

	protected openPlatinum(id: string) {
		const platinum = this.platinums().find(item => item.id === id);
		if (platinum) this.platinumClick.emit(platinum);
	}

	private latestPlatinumMonth(): Date | null {
		const latest = this.datedPlatinums()
			.map(platinum => parseDateOnly(platinum.platinumedAt))
			.reduce<Date | null>(
				(max, date) => (!max || date > max ? date : max),
				null
			);
		return latest
			? new Date(latest.getFullYear(), latest.getMonth(), 1)
			: null;
	}
}
