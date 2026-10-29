import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import {
	type RewindBacklogFlowMonth,
	type RewindCriticGap,
	type RewindGenre,
	type RewindLanguage,
	type RewindMonthHours,
	type RewindPremiumStats as RewindPremiumStatsData
} from "../../../../core/models/rewind.model";
import { GamePoster } from "../../../../shared/components/game-poster/game-poster";
import { UiPremiumBadge } from "../../../../shared/ui";
import {
	formatHours,
	formatPercent,
	formatRewindNumber,
	monthName,
	rewindCopy,
	shortMonthName
} from "../../rewind-copy";
import { RewindReveal } from "../../rewind-reveal";
import { REWIND_PREMIUM_FRAME_CLASS } from "../../rewind-tone";
import {
	type BacklogFlowBar,
	type CriticGapRow,
	type GenreShareRow,
	type MonthHoursBar
} from "./rewind-premium-stats.model";

const PREMIUM_STATS_PERK =
	"These charts show the year in more detail: hours by month, ratings against the critics, the backlog and genres.";

export const MONTHS_IN_YEAR = 12;

function months(): number[] {
	return Array.from({ length: MONTHS_IN_YEAR }, (_, index) => index + 1);
}

function safeNumber(value: number): number {
	return Number.isFinite(value) ? value : 0;
}

function safeCount(value: number | undefined): number {
	return Math.max(0, safeNumber(value ?? 0));
}

function percentOf(value: number, max: number): number {
	return max > 0 ? (Math.max(0, value) / max) * 100 : 0;
}

export function monthHoursBars(entries: RewindMonthHours[]): MonthHoursBar[] {
	const hoursByMonth = new Map(
		entries.map(entry => [entry.month, safeCount(entry.hours)])
	);
	const values = months().map(month => hoursByMonth.get(month) ?? 0);
	const max = Math.max(0, ...values);
	if (max <= 0) return [];
	return months().map((month, index) => ({
		month,
		hours: values[index],
		heightPercent: percentOf(values[index], max),
		isPeak: values[index] === max
	}));
}

export function criticGapRows(games: RewindCriticGap[]): CriticGapRow[] {
	const maxGap = Math.max(
		0,
		...games.map(game => Math.abs(safeNumber(game.gap)))
	);
	return games.map(game => {
		const gap = safeNumber(game.gap);
		return {
			...game,
			gap,
			direction: gap > 0 ? "more" : gap < 0 ? "less" : "same",
			widthPercent: maxGap > 0 ? (Math.abs(gap) / maxGap) * 50 : 0
		};
	});
}

export function backlogFlowBars(
	entries: RewindBacklogFlowMonth[]
): BacklogFlowBar[] {
	const byMonth = new Map(entries.map(entry => [entry.month, entry]));
	const values = months().map(month => ({
		month,
		added: safeCount(byMonth.get(month)?.added),
		finished: safeCount(byMonth.get(month)?.finished)
	}));
	const max = Math.max(
		0,
		...values.flatMap(value => [value.added, value.finished])
	);
	if (max <= 0) return [];
	return values.map(value => ({
		...value,
		addedPercent: percentOf(value.added, max),
		finishedPercent: percentOf(value.finished, max)
	}));
}

export function genreShareRows(genres: RewindGenre[]): GenreShareRow[] {
	const counted = genres.filter(genre => safeNumber(genre.count) > 0);
	const total = counted.reduce((sum, genre) => sum + genre.count, 0);
	const max = Math.max(0, ...counted.map(genre => genre.count));
	if (total <= 0) return [];
	return counted.map(genre => ({
		...genre,
		sharePercent: (genre.count / total) * 100,
		widthPercent: percentOf(genre.count, max)
	}));
}

export function hasPremiumCharts(stats: RewindPremiumStatsData): boolean {
	return (
		monthHoursBars(stats.hoursByMonth).length > 0 ||
		criticGapRows(stats.tasteVsCritics).length > 0 ||
		backlogFlowBars(stats.backlogFlow).length > 0 ||
		genreShareRows(stats.genreShare).length > 0
	);
}

@Component({
	selector: "app-rewind-premium-stats",
	imports: [GamePoster, RewindReveal, UiPremiumBadge],
	templateUrl: "./rewind-premium-stats.html",
	host: { class: "block empty:hidden" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindPremiumStats {
	protected readonly premiumPerk = PREMIUM_STATS_PERK;
	readonly stats = input.required<RewindPremiumStatsData>();
	readonly language = input<RewindLanguage>("en");

	protected readonly frameClass = REWIND_PREMIUM_FRAME_CLASS;

	protected readonly copy = computed(
		() => rewindCopy(this.language()).premiumStats
	);

	protected readonly hoursBars = computed(() =>
		monthHoursBars(this.stats().hoursByMonth)
	);
	protected readonly gapRows = computed(() =>
		criticGapRows(this.stats().tasteVsCritics)
	);
	protected readonly flowBars = computed(() =>
		backlogFlowBars(this.stats().backlogFlow)
	);
	protected readonly genreRows = computed(() =>
		genreShareRows(this.stats().genreShare)
	);

	protected readonly hasAnyChart = computed(() =>
		hasPremiumCharts(this.stats())
	);

	protected readonly netBalance = computed(() =>
		this.flowBars().reduce((sum, bar) => sum + bar.added - bar.finished, 0)
	);

	protected readonly netBalanceText = computed(() => {
		const net = this.netBalance();
		const copy = this.copy();
		if (net > 0) return copy.backlogGrew(net);
		if (net < 0) return copy.backlogShrank(Math.abs(net));
		return copy.backlogEven;
	});

	protected readonly flowTotals = computed(() =>
		this.flowBars().reduce(
			(totals, bar) => ({
				added: totals.added + bar.added,
				finished: totals.finished + bar.finished
			}),
			{ added: 0, finished: 0 }
		)
	);

	protected monthLabel(month: number): string {
		return shortMonthName(month, this.language());
	}

	protected fullMonth(month: number): string {
		return monthName(month, this.language());
	}

	protected hours(value: number): string {
		return `${formatHours(value, this.language())} h`;
	}

	protected number(value: number): string {
		return formatRewindNumber(value, this.language());
	}

	protected signedNumber(value: number): string {
		return new Intl.NumberFormat(rewindCopy(this.language()).locale, {
			maximumFractionDigits: 1,
			signDisplay: "exceptZero"
		}).format(value);
	}

	protected percent(value: number): string {
		return formatPercent(Math.round(value), this.language());
	}

	protected gapLabel(row: CriticGapRow): string {
		const copy = this.copy();
		if (row.direction === "more") return copy.likedMore;
		if (row.direction === "less") return copy.likedLess;
		return copy.agreed;
	}

	protected barHint(month: number, value: string): string {
		return `${this.fullMonth(month)}: ${value}`;
	}
}
