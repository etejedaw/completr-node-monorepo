import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import {
	type RewindCriticGap,
	type RewindGenre,
	type RewindLanguage,
	type RewindMonthHours,
	type RewindPremiumAccessKind,
	type RewindPremiumStats
} from "../../../../../core/models/rewind.model";
import { GamePoster } from "../../../../../shared/components/game-poster/game-poster";
import { UiPremiumBadge } from "../../../../../shared/ui";
import {
	formatHours,
	formatPercent,
	formatRewindNumber,
	monthName,
	shortMonthName
} from "../../../rewind-copy";
import { RewindReveal } from "../../../rewind-reveal";
import { REWIND_PREMIUM_FRAME_CLASS } from "../../../rewind-tone";
import { rewindDesign2025Copy } from "../rewind-design-2025.copy";
import {
	type Rewind2025CriticGapRow,
	type Rewind2025GenreShareRow,
	type Rewind2025MonthHoursBar
} from "./rewind-2025-premium-stats.model";

const PREMIUM_STATS_PERK =
	"These charts show the year in more detail: hours by month, ratings against the critics and genres.";

const MONTHS_IN_YEAR = 12;

export const REWIND_2025_GENRE_MAX_ROWS = 8;

const OTHER_GENRES_CODE = "other-genres";

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

export function rewind2025HoursBars(
	entries: RewindMonthHours[]
): Rewind2025MonthHoursBar[] {
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

export function rewind2025CriticGapRows(
	games: RewindCriticGap[]
): Rewind2025CriticGapRow[] {
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

function groupTailGenres(
	genres: RewindGenre[],
	othersLabel: (count: number) => string
): (RewindGenre & { isOthers: boolean })[] {
	const named = genres.map(genre => ({ ...genre, isOthers: false }));
	if (genres.length <= REWIND_2025_GENRE_MAX_ROWS) return named;
	const kept = named.slice(0, REWIND_2025_GENRE_MAX_ROWS - 1);
	const tail = genres.slice(REWIND_2025_GENRE_MAX_ROWS - 1);
	return [
		...kept,
		{
			code: OTHER_GENRES_CODE,
			name: othersLabel(tail.length),
			count: tail.reduce((sum, genre) => sum + genre.count, 0),
			isOthers: true
		}
	];
}

export function rewind2025GenreRows(
	genres: RewindGenre[],
	othersLabel: (count: number) => string = count => `${count} more`
): Rewind2025GenreShareRow[] {
	const counted = genres.filter(genre => safeNumber(genre.count) > 0);
	const total = counted.reduce((sum, genre) => sum + genre.count, 0);
	if (total <= 0) return [];
	const rows = groupTailGenres(counted, othersLabel);
	const max = Math.max(0, ...rows.map(row => row.count));
	return rows.map(row => ({
		...row,
		sharePercent: (row.count / total) * 100,
		widthPercent: percentOf(row.count, max)
	}));
}

export function hasRewind2025PremiumCharts(stats: RewindPremiumStats): boolean {
	return (
		rewind2025HoursBars(stats.hoursByMonth).length > 0 ||
		rewind2025CriticGapRows(stats.tasteVsCritics).length > 0 ||
		rewind2025GenreRows(stats.genreShare).length > 0
	);
}

@Component({
	selector: "app-rewind-2025-premium-stats",
	imports: [GamePoster, RewindReveal, UiPremiumBadge],
	templateUrl: "./rewind-2025-premium-stats.html",
	host: { class: "block empty:hidden" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Rewind2025PremiumStats {
	protected readonly premiumPerk = PREMIUM_STATS_PERK;
	readonly stats = input.required<RewindPremiumStats>();
	readonly language = input<RewindLanguage>("en");
	readonly premiumAccessKind = input<RewindPremiumAccessKind | null>(null);

	protected readonly frameClass = REWIND_PREMIUM_FRAME_CLASS;

	private readonly designCopy = computed(() =>
		rewindDesign2025Copy(this.language())
	);

	protected readonly copy = computed(() => this.designCopy().premiumStats);

	protected readonly premiumLabel = computed(() => {
		const kind = this.premiumAccessKind();
		return kind ? this.copy().premiumLabels[kind] : null;
	});

	protected readonly hoursBars = computed(() =>
		rewind2025HoursBars(this.stats().hoursByMonth)
	);
	protected readonly gapRows = computed(() =>
		rewind2025CriticGapRows(this.stats().tasteVsCritics)
	);
	protected readonly genreRows = computed(() =>
		rewind2025GenreRows(this.stats().genreShare, this.copy().moreGenres)
	);

	protected readonly hasAnyChart = computed(() =>
		hasRewind2025PremiumCharts(this.stats())
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
		return new Intl.NumberFormat(this.designCopy().locale, {
			maximumFractionDigits: 1,
			signDisplay: "exceptZero"
		}).format(value);
	}

	protected percent(value: number): string {
		return formatPercent(Math.round(value), this.language());
	}

	protected gapLabel(row: Rewind2025CriticGapRow): string {
		const copy = this.copy();
		if (row.direction === "more") return copy.likedMore;
		if (row.direction === "less") return copy.likedLess;
		return copy.agreed;
	}

	protected barHint(month: number, value: string): string {
		return `${this.fullMonth(month)}: ${value}`;
	}
}
