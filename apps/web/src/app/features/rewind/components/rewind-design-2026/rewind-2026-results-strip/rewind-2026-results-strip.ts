import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	DOCUMENT,
	inject,
	input,
	signal
} from "@angular/core";

import {
	type RewindLanguage,
	type RewindTotals
} from "../../../../../core/models/rewind.model";
import { InView } from "../../../../../shared/directives/in-view";
import {
	formatHours,
	formatPercent,
	formatRating,
	formatRewindNumber,
	rewindCopy
} from "../../../rewind-copy";
import { canAnimateRewind } from "../../../rewind-motion";
import {
	type PhoneColumns,
	type Rewind2026PhoneLayout,
	type Rewind2026ResultsRow,
	type Rewind2026ResultsUnit
} from "./rewind-2026-results-strip.model";

export const REWIND_2026_RESULTS_DURATION_MS = 900;
export const REWIND_2026_RESULTS_STAGGER_MS = 80;

const RATING_SCALE = 5;

const UNIT_SUFFIX: Record<Rewind2026ResultsUnit, string | null> = {
	count: null,
	hours: "h",
	percent: "%",
	rating: `/${RATING_SCALE}`
};

const COMPACT_ROW_COUNT = 4;

const PHONE_GRID_CLASS: Record<PhoneColumns, string> = {
	2: "grid-cols-2",
	3: "grid-cols-3"
};

const PHONE_LEAD_SPAN_CLASS: Record<PhoneColumns, string> = {
	2: "max-lg:col-span-2",
	3: "max-lg:col-span-3"
};

const PHONE_ROW_START_CLASS = "max-lg:border-l-0 max-lg:pl-0";

export function phoneLayoutFor(count: number): Rewind2026PhoneLayout {
	if (count % 3 === 0) return { columns: 3, hasLead: false };
	if (count % 2 === 0) return { columns: 2, hasLead: false };
	if ((count - 1) % 3 === 0) return { columns: 3, hasLead: true };
	return { columns: 2, hasLead: true };
}

export function startsPhoneRow(
	layout: Rewind2026PhoneLayout,
	index: number
): boolean {
	if (!layout.hasLead) return index % layout.columns === 0;
	return index === 0 || (index - 1) % layout.columns === 0;
}

export function rewind2026ResultsRows(
	totals: RewindTotals,
	language: RewindLanguage = "en"
): Rewind2026ResultsRow[] {
	const copy = rewindCopy(language).tally;
	const rows: (Rewind2026ResultsRow | null)[] = [
		{
			label: copy.finished,
			value: totals.finished,
			unit: "count"
		},
		{
			label: copy.abandoned,
			value: totals.abandoned,
			unit: "count"
		},
		totals.started > 0
			? {
					label: copy.started,
					value: totals.started,
					unit: "count"
				}
			: null,
		{
			label: copy.hoursPlayed,
			value: totals.hoursPlayed,
			unit: "hours"
		},
		totals.platinums
			? {
					label: copy.platinums,
					value: totals.platinums,
					unit: "count"
				}
			: null,
		totals.finishRate !== null
			? {
					label: copy.finishRate,
					value: totals.finishRate,
					unit: "percent"
				}
			: null,
		totals.averageRating !== null
			? {
					label: copy.averageRating,
					value: totals.averageRating,
					unit: "rating"
				}
			: null
	];
	return rows.filter(row => row !== null);
}

export function formatRewind2026ResultsValue(
	unit: Rewind2026ResultsUnit,
	value: number,
	language: RewindLanguage = "en"
): string {
	if (unit === "percent")
		return formatRewindNumber(value, language, { min: 0, max: 0 });
	if (unit === "rating") return formatRating(value, language);
	return formatHours(value, language);
}

function spokenResultsValue(
	row: Rewind2026ResultsRow,
	language: RewindLanguage
): string {
	if (row.unit === "percent") return formatPercent(row.value, language);
	const value = formatRewind2026ResultsValue(row.unit, row.value, language);
	return row.unit === "rating"
		? rewindCopy(language).tally.outOf(value, RATING_SCALE)
		: value;
}

function easeOutCubic(progress: number): number {
	return 1 - Math.pow(1 - progress, 3);
}

function countedValue(target: number, progress: number): number {
	const eased = target * easeOutCubic(progress);
	return Number.isInteger(target)
		? Math.round(eased)
		: Math.round(eased * 10) / 10;
}

@Component({
	selector: "app-rewind-2026-results-strip",
	imports: [InView],
	templateUrl: "./rewind-2026-results-strip.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Rewind2026ResultsStrip {
	readonly totals = input.required<RewindTotals>();
	readonly language = input<RewindLanguage>("en");

	private readonly window = inject(DOCUMENT).defaultView;
	private readonly elapsed = signal<number | null>(null);
	private readonly animates = this.canAnimate();
	private frameId: number | null = null;
	private hasStarted = false;

	protected readonly heading = computed(
		() => rewindCopy(this.language()).page.results
	);

	protected readonly rows = computed(() =>
		rewind2026ResultsRows(this.totals(), this.language())
	);

	private readonly layout = computed(() =>
		phoneLayoutFor(this.rows().length)
	);

	private readonly totalDuration = computed(
		() =>
			REWIND_2026_RESULTS_DURATION_MS +
			REWIND_2026_RESULTS_STAGGER_MS * (this.rows().length - 1)
	);

	constructor() {
		inject(DestroyRef).onDestroy(() => this.stopFrames());
	}

	protected start() {
		if (this.hasStarted || !this.animates) return;
		this.hasStarted = true;
		const startedAt = this.window!.performance.now();
		this.elapsed.set(0);
		const tick = (now: number) => {
			const elapsed = now - startedAt;
			this.elapsed.set(elapsed);
			this.frameId =
				elapsed < this.totalDuration()
					? this.window!.requestAnimationFrame(tick)
					: null;
		};
		this.frameId = this.window!.requestAnimationFrame(tick);
	}

	protected displayValue(row: Rewind2026ResultsRow, index: number): string {
		const elapsed = this.elapsed();
		if (elapsed === null) {
			return formatRewind2026ResultsValue(
				row.unit,
				this.animates ? 0 : row.value,
				this.language()
			);
		}
		const local =
			(elapsed - index * REWIND_2026_RESULTS_STAGGER_MS) /
			REWIND_2026_RESULTS_DURATION_MS;
		const progress = Math.min(1, Math.max(0, local));
		return formatRewind2026ResultsValue(
			row.unit,
			countedValue(row.value, progress),
			this.language()
		);
	}

	protected spoken(row: Rewind2026ResultsRow): string {
		return spokenResultsValue(row, this.language());
	}

	protected suffixOf(row: Rewind2026ResultsRow): string | null {
		return UNIT_SUFFIX[row.unit];
	}

	protected gridClass(): string {
		const layout = this.layout();
		return `${PHONE_GRID_CLASS[layout.columns]} ${
			this.rows().length <= COMPACT_ROW_COUNT
				? "lg:auto-cols-[minmax(0,12rem)]"
				: "lg:auto-cols-fr"
		}`;
	}

	protected cellClass(index: number): string {
		const layout = this.layout();
		const isLead = layout.hasLead && index === 0;
		const classes = [];
		if (isLead) classes.push(PHONE_LEAD_SPAN_CLASS[layout.columns]);
		if (startsPhoneRow(layout, index)) classes.push(PHONE_ROW_START_CLASS);
		return classes.join(" ");
	}

	protected numberClass(index: number): string {
		return this.layout().hasLead && index === 0
			? "max-lg:text-[2.4rem]"
			: "";
	}

	private canAnimate(): boolean {
		return (
			!!this.window?.requestAnimationFrame &&
			canAnimateRewind(this.window)
		);
	}

	private stopFrames() {
		if (this.frameId !== null)
			this.window?.cancelAnimationFrame(this.frameId);
		this.frameId = null;
	}
}
