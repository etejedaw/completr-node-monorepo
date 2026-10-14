import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { GamePoster } from "../../../../shared/components/game-poster/game-poster";
import { RatingDistribution } from "../../../../shared/components/rating-distribution/rating-distribution";
import { StarRating } from "../../../../shared/components/star-rating/star-rating";
import { UiButton, UiProgress, UiSkeleton } from "../../../../shared/ui";
import {
	type BacklogHighlight,
	type SavedFilterStats,
	STAT_KEYS,
	type StatKey,
	SUMMARY_STAT_KEYS
} from "../../saved-filters";
import { CompletionsChart } from "../completions-chart/completions-chart";
import { StatsCard } from "../stats-card/stats-card";
import { StatusBreakdown } from "../status-breakdown/status-breakdown";

type HighlightStatKey = "longestPlayed" | "bestPersonalRatio" | "highestRated";

interface SummaryTile {
	key: StatKey;
	label: string;
	value: string;
	valueClass: string;
	hint: string | null;
}

interface HighlightDescriptor {
	key: HighlightStatKey;
	label: string;
	icon: string;
	iconClass: string;
	formattedValue: string;
	entry: BacklogHighlight;
}

interface DurationBar {
	label: string;
	value: number;
	percent: number;
	fillClass: string;
}

type DeltaTone = "longer" | "shorter" | "even";

interface DeltaDescriptor {
	text: string;
	icon: string;
	toneClass: string;
	caption: string;
}

const HIGHLIGHT_DEFINITIONS: readonly {
	key: HighlightStatKey;
	label: string;
	icon: string;
	iconClass: string;
	suffix: string;
	decimals: number;
}[] = [
	{
		key: "longestPlayed",
		label: "Longest played",
		icon: "hourglass_bottom",
		iconClass: "text-fg-secondary",
		suffix: "h",
		decimals: 1
	},
	{
		key: "bestPersonalRatio",
		label: "Best personal ratio",
		icon: "bolt",
		iconClass: "text-brand",
		suffix: "",
		decimals: 2
	},
	{
		key: "highestRated",
		label: "Highest rated",
		icon: "star",
		iconClass: "text-rating",
		suffix: "",
		decimals: 1
	}
];

const DELTA_STYLES: Record<DeltaTone, Omit<DeltaDescriptor, "text">> = {
	longer: {
		icon: "trending_up",
		toneClass: "text-warning",
		caption: "longer than estimated across completed games"
	},
	shorter: {
		icon: "trending_down",
		toneClass: "text-success",
		caption: "shorter than estimated across completed games"
	},
	even: {
		icon: "trending_flat",
		toneClass: "text-fg-secondary",
		caption: "right on the estimate across completed games"
	}
};

const SUMMARY_KEY_SET: ReadonlySet<StatKey> = new Set(SUMMARY_STAT_KEYS);
const DETAIL_STAT_KEYS: readonly StatKey[] = STAT_KEYS.filter(
	key =>
		!SUMMARY_KEY_SET.has(key) &&
		!HIGHLIGHT_DEFINITIONS.some(definition => definition.key === key)
);

const SUMMARY_COLUMN_CLASSES: Record<number, string> = {
	1: "grid-cols-1",
	2: "grid-cols-2",
	3: "grid-cols-3",
	4: "grid-cols-2 sm:grid-cols-4"
};

@Component({
	selector: "app-saved-view-stats",
	imports: [
		CompletionsChart,
		GamePoster,
		RatingDistribution,
		RouterLink,
		StarRating,
		StatsCard,
		StatusBreakdown,
		UiButton,
		UiProgress,
		UiSkeleton
	],
	templateUrl: "./saved-view-stats.html",
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SavedViewStats {
	readonly stats = input<SavedFilterStats | null>(null);
	readonly enabledStats = input.required<ReadonlySet<StatKey>>();
	readonly loading = input(false);
	readonly loadFailed = input(false);
	readonly expanded = input(false);

	readonly expandedToggle = output<void>();
	readonly retryRequested = output<void>();

	protected readonly hasSummary = computed(() =>
		SUMMARY_STAT_KEYS.some(key => this.isStatEnabled(key))
	);

	protected readonly hasExtras = computed(
		() =>
			DETAIL_STAT_KEYS.some(key => this.isStatEnabled(key)) ||
			HIGHLIGHT_DEFINITIONS.some(definition =>
				this.isStatEnabled(definition.key)
			)
	);

	protected readonly canToggle = computed(
		() => this.hasSummary() && this.hasExtras()
	);

	protected readonly showDetails = computed(
		() => this.hasExtras() && (this.expanded() || !this.hasSummary())
	);

	protected readonly summaryTiles = computed<SummaryTile[]>(() => {
		const stats = this.stats();
		if (!stats) return [];
		const tiles: SummaryTile[] = [
			{
				key: "totalEntries",
				label: "Entries",
				value: this.formatStat(stats.totalEntries, "", 0),
				valueClass: "text-fg",
				hint: null
			},
			{
				key: "totalRealHours",
				label: "Real hours",
				value: this.formatStat(stats.totalRealHours, "h", 1),
				valueClass: "text-fg",
				hint: "Hours you actually played"
			},
			{
				key: "avgRatio",
				label: "Avg ratio",
				value: this.formatStat(stats.avgRatio),
				valueClass: "text-brand",
				hint: "Score per estimated hour"
			},
			{
				key: "avgPersonalRatio",
				label: "Avg personal ratio",
				value: this.formatStat(stats.avgPersonalRatio),
				valueClass: "text-brand",
				hint: "Score per hour you played"
			}
		];
		return tiles.filter(tile => this.isStatEnabled(tile.key));
	});

	protected readonly summaryColumnsClass = computed(
		() =>
			SUMMARY_COLUMN_CLASSES[this.summaryTiles().length] ??
			SUMMARY_COLUMN_CLASSES[4]
	);

	protected readonly hasPace = computed(
		() =>
			this.isStatEnabled("completionRate") ||
			this.isStatEnabled("abandonmentRate")
	);

	protected readonly hasDurations = computed(
		() =>
			this.isStatEnabled("avgEstimatedDuration") ||
			this.isStatEnabled("avgRealDuration") ||
			this.isStatEnabled("estimatedVsRealDelta")
	);

	protected readonly hasScores = computed(
		() =>
			this.isStatEnabled("avgScore") ||
			this.isStatEnabled("avgUserRating")
	);

	protected readonly durationBars = computed<DurationBar[]>(() => {
		const stats = this.stats();
		if (!stats) return [];
		const bars = [
			{
				key: "avgEstimatedDuration" as const,
				label: "Estimated",
				value: stats.avgEstimatedDuration,
				fillClass: "bg-fg-muted"
			},
			{
				key: "avgRealDuration" as const,
				label: "Your run",
				value: stats.avgRealDuration,
				fillClass: "bg-brand"
			}
		].filter(
			(bar): bar is typeof bar & { value: number } =>
				this.isStatEnabled(bar.key) && bar.value !== null
		);
		const max = Math.max(0, ...bars.map(bar => bar.value));
		return bars.map(bar => ({
			label: bar.label,
			value: bar.value,
			percent: max ? (bar.value / max) * 100 : 0,
			fillClass: bar.fillClass
		}));
	});

	protected readonly delta = computed<DeltaDescriptor | null>(() => {
		const value = this.stats()?.estimatedVsRealDelta;
		if (!this.isStatEnabled("estimatedVsRealDelta") || value == null) {
			return null;
		}
		const tone: DeltaTone =
			value > 0 ? "longer" : value < 0 ? "shorter" : "even";
		const sign = value > 0 ? "+" : "";
		return {
			...DELTA_STYLES[tone],
			text: sign + this.formatStat(value, "h", 1)
		};
	});

	protected readonly completionsRange = computed(() => {
		const months = this.stats()?.completionsByMonth ?? [];
		const first = months[0];
		const last = months[months.length - 1];
		if (!first || !last) return null;
		return `${this.formatMonthKey(first.month)} – ${this.formatMonthKey(last.month)}`;
	});

	protected readonly ratedGamesCount = computed(() =>
		(this.stats()?.ratingDistribution ?? []).reduce(
			(sum, bucket) => sum + bucket.count,
			0
		)
	);

	protected readonly highlights = computed<HighlightDescriptor[]>(() => {
		const stats = this.stats();
		if (!stats) return [];
		return HIGHLIGHT_DEFINITIONS.flatMap(definition => {
			const entry = stats[definition.key];
			if (!this.isStatEnabled(definition.key) || !entry) return [];
			return [
				{
					key: definition.key,
					label: definition.label,
					icon: definition.icon,
					iconClass: definition.iconClass,
					formattedValue: this.formatStat(
						entry.value,
						definition.suffix,
						definition.decimals
					),
					entry
				}
			];
		});
	});

	protected isStatEnabled(key: StatKey): boolean {
		return this.enabledStats().has(key);
	}

	protected formatStat(
		value: number | null,
		suffix = "",
		decimals = 2
	): string {
		if (value == null) return "—";
		const rounded =
			decimals === 0
				? Math.round(value).toString()
				: value.toFixed(decimals).replace(/\.?0+$/, "");
		return rounded + suffix;
	}

	protected formatPercent(value: number | null): string {
		if (value == null) return "—";
		return (value * 100).toFixed(0) + "%";
	}

	private formatMonthKey(month: string): string {
		const [year, monthNumber] = month.split("-").map(Number);
		return new Date(
			Date.UTC(year ?? 1970, (monthNumber ?? 1) - 1, 1)
		).toLocaleString("en", {
			month: "short",
			year: "numeric",
			timeZone: "UTC"
		});
	}
}
