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
} from "../../../../core/models/rewind.model";
import { StarRating } from "../../../../shared/components/star-rating/star-rating";
import { InView } from "../../../../shared/directives/in-view";
import {
	formatHours,
	formatPercent,
	formatRating,
	rewindCopy
} from "../../rewind-copy";
import { canAnimateRewind } from "../../rewind-motion";
import { type RewindTone, toneVar } from "../../rewind-tone";

export type RewindTallyUnit = "count" | "hours" | "percent" | "rating";

export interface RewindTallyRow {
	label: string;
	value: number;
	tone: RewindTone;
	unit: RewindTallyUnit;
}

export const TALLY_DURATION_MS = 900;
export const TALLY_STAGGER_MS = 80;

const RATING_SCALE = 5;

export function rewindTallyRows(
	totals: RewindTotals,
	language: RewindLanguage = "en"
): RewindTallyRow[] {
	const copy = rewindCopy(language).tally;
	const rows: (RewindTallyRow | null)[] = [
		{
			label: copy.finished,
			value: totals.finished,
			tone: "success",
			unit: "count"
		},
		{
			label: copy.abandoned,
			value: totals.abandoned,
			tone: "danger",
			unit: "count"
		},
		totals.started > 0
			? {
					label: copy.started,
					value: totals.started,
					tone: "playing",
					unit: "count"
				}
			: null,
		{
			label: copy.hoursPlayed,
			value: totals.hoursPlayed,
			tone: "playing",
			unit: "hours"
		},
		totals.platinums
			? {
					label: copy.platinums,
					value: totals.platinums,
					tone: "platinum",
					unit: "count"
				}
			: null,
		totals.finishRate !== null
			? {
					label: copy.finishRate,
					value: totals.finishRate,
					tone: "lists",
					unit: "percent"
				}
			: null,
		totals.averageRating !== null
			? {
					label: copy.averageRating,
					value: totals.averageRating,
					tone: "brand",
					unit: "rating"
				}
			: null
	];
	return rows.filter(row => row !== null);
}

export function formatTallyValue(
	unit: RewindTallyUnit,
	value: number,
	language: RewindLanguage = "en"
): string {
	if (unit === "percent") return formatPercent(value, language);
	if (unit === "rating") return formatRating(value, language);
	return formatHours(value, language);
}

function spokenTallyValue(
	row: RewindTallyRow,
	language: RewindLanguage
): string {
	const value = formatTallyValue(row.unit, row.value, language);
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
	selector: "app-rewind-tally",
	imports: [InView, StarRating],
	template: `
		<dl
			class="m-0 flex flex-col"
			appInView
			(inViewChange)="$event && start()"
		>
			@for (row of rows(); track row.label; let i = $index) {
				<div
					class="flex items-center gap-3 border-b border-l-4 border-b-line border-l-(--tone) py-3 pl-3 sm:py-4 sm:pl-4 last:border-b-0"
					[style.--tone]="toneOf(row)"
				>
					<dt
						class="flex min-w-0 flex-1 items-baseline gap-3 text-sm sm:text-base text-fg-secondary"
					>
						<span class="shrink-0">{{ row.label }}</span>
						<span
							aria-hidden="true"
							class="min-w-4 flex-1 border-b-2 border-dotted border-line-hover"
						></span>
					</dt>
					<dd
						class="m-0 flex shrink-0 items-center gap-2.5 font-display text-4xl sm:text-5xl font-semibold leading-none tabular-nums text-(--tone)"
					>
						@if (row.unit === "rating") {
							<app-star-rating
								aria-hidden="true"
								class="max-sm:hidden"
								size="sm"
								[value]="row.value"
								[readonly]="true"
								[showValue]="false"
							/>
						}
						<span aria-hidden="true">{{
							displayValue(row, i)
						}}</span>
						<span class="sr-only">{{ spoken(row) }}</span>
					</dd>
				</div>
			}
		</dl>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindTally {
	readonly rows = input.required<RewindTallyRow[]>();
	readonly language = input<RewindLanguage>("en");

	private readonly window = inject(DOCUMENT).defaultView;
	private readonly elapsed = signal<number | null>(null);
	private readonly animates = this.canAnimate();
	private frameId: number | null = null;
	private hasStarted = false;

	private readonly totalDuration = computed(
		() => TALLY_DURATION_MS + TALLY_STAGGER_MS * (this.rows().length - 1)
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

	protected displayValue(row: RewindTallyRow, index: number): string {
		const elapsed = this.elapsed();
		if (elapsed === null) {
			return formatTallyValue(
				row.unit,
				this.animates ? 0 : row.value,
				this.language()
			);
		}
		const local = (elapsed - index * TALLY_STAGGER_MS) / TALLY_DURATION_MS;
		const progress = Math.min(1, Math.max(0, local));
		return formatTallyValue(
			row.unit,
			countedValue(row.value, progress),
			this.language()
		);
	}

	protected spoken(row: RewindTallyRow): string {
		return spokenTallyValue(row, this.language());
	}

	protected toneOf(row: RewindTallyRow): string {
		return toneVar(row.tone);
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
