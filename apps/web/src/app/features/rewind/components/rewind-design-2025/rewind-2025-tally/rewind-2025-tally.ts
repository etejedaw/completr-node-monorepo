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
import { StarRating } from "../../../../../shared/components/star-rating/star-rating";
import { InView } from "../../../../../shared/directives/in-view";
import { formatHours, formatRating } from "../../../rewind-copy";
import { canAnimateRewind } from "../../../rewind-motion";
import { rewindDesign2025Copy } from "../rewind-design-2025.copy";
import {
	type Rewind2025TallyRow,
	type Rewind2025TallyUnit
} from "./rewind-2025-tally.model";

export const REWIND_2025_TALLY_DURATION_MS = 900;
export const REWIND_2025_TALLY_STAGGER_MS = 80;

const RATING_SCALE = 5;

const UNIT_SUFFIX: Record<Rewind2025TallyUnit, string | null> = {
	count: null,
	hours: "h",
	rating: `/${RATING_SCALE}`
};

const CELL_CLASSES = [
	"pr-3",
	"border-l px-3 @3xl/page:px-5",
	"border-t pr-3 @3xl/page:border-t-0 @3xl/page:border-l @3xl/page:px-5",
	"border-l border-t px-3 @3xl/page:border-t-0 @3xl/page:px-5"
];

export function rewind2025TallyRows(
	totals: RewindTotals,
	language: RewindLanguage = "en"
): Rewind2025TallyRow[] {
	const copy = rewindDesign2025Copy(language).tally;
	const rows: Rewind2025TallyRow[] = [
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
		{
			label: copy.hoursPlayed,
			value: totals.hoursPlayed,
			unit: "hours"
		}
	];
	return totals.averageRating === null
		? rows
		: [
				...rows,
				{
					label: copy.averageRating,
					value: totals.averageRating,
					unit: "rating"
				}
			];
}

export function formatRewind2025TallyValue(
	unit: Rewind2025TallyUnit,
	value: number,
	language: RewindLanguage = "en"
): string {
	if (unit === "rating") return formatRating(value, language);
	return formatHours(value, language);
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
	selector: "app-rewind-2025-tally",
	imports: [InView, StarRating],
	templateUrl: "./rewind-2025-tally.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Rewind2025Tally {
	readonly rows = input.required<Rewind2025TallyRow[]>();
	readonly language = input<RewindLanguage>("en");

	private readonly window = inject(DOCUMENT).defaultView;
	private readonly elapsed = signal<number | null>(null);
	private readonly animates = this.canAnimate();
	private frameId: number | null = null;
	private hasStarted = false;

	private readonly totalDuration = computed(
		() =>
			REWIND_2025_TALLY_DURATION_MS +
			REWIND_2025_TALLY_STAGGER_MS * (this.rows().length - 1)
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

	protected displayValue(row: Rewind2025TallyRow, index: number): string {
		const elapsed = this.elapsed();
		if (elapsed === null) {
			return formatRewind2025TallyValue(
				row.unit,
				this.animates ? 0 : row.value,
				this.language()
			);
		}
		const local =
			(elapsed - index * REWIND_2025_TALLY_STAGGER_MS) /
			REWIND_2025_TALLY_DURATION_MS;
		const progress = Math.min(1, Math.max(0, local));
		return formatRewind2025TallyValue(
			row.unit,
			countedValue(row.value, progress),
			this.language()
		);
	}

	protected spoken(row: Rewind2025TallyRow): string {
		const value = formatRewind2025TallyValue(
			row.unit,
			row.value,
			this.language()
		);
		return row.unit === "rating"
			? rewindDesign2025Copy(this.language()).tally.outOf(
					value,
					RATING_SCALE
				)
			: value;
	}

	protected suffixOf(row: Rewind2025TallyRow): string | null {
		return UNIT_SUFFIX[row.unit];
	}

	protected cellClass(index: number): string {
		return CELL_CLASSES[index % CELL_CLASSES.length];
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
