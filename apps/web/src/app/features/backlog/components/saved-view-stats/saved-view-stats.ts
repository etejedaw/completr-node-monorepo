import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { CoverUrlPipe } from "../../../../shared/pipes/cover-url";
import { UiSkeleton } from "../../../../shared/ui";
import {
	type BacklogHighlight,
	type SavedFilterStats,
	type StatKey
} from "../../saved-filters";

const EXPANDED_STAT_KEYS: readonly StatKey[] = [
	"completionRate",
	"abandonmentRate",
	"avgRealDuration",
	"avgEstimatedDuration",
	"avgScore",
	"avgUserRating",
	"estimatedVsRealDelta"
];

type HighlightStatKey = "longestPlayed" | "bestPersonalRatio" | "highestRated";

interface HighlightDefinition {
	key: HighlightStatKey;
	label: string;
	valueClass: string;
	format: (value: number | null) => string;
}

interface HighlightDescriptor {
	key: HighlightStatKey;
	label: string;
	valueClass: string;
	formattedValue: string;
	entry: BacklogHighlight;
}

const HIGHLIGHT_STAT_KEYS: readonly HighlightStatKey[] = [
	"longestPlayed",
	"bestPersonalRatio",
	"highestRated"
];

@Component({
	selector: "app-saved-view-stats",
	imports: [RouterLink, CoverUrlPipe, UiSkeleton],
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

	private readonly highlightDefinitions: readonly HighlightDefinition[] = [
		{
			key: "longestPlayed",
			label: "Longest played",
			valueClass: "block text-xs text-fg-secondary tabular-nums",
			format: value => this.formatStat(value, "h", 1)
		},
		{
			key: "bestPersonalRatio",
			label: "Best personal ratio",
			valueClass: "block text-xs text-brand font-semibold tabular-nums",
			format: value => this.formatStat(value)
		},
		{
			key: "highestRated",
			label: "Highest rated",
			valueClass: "block text-xs text-rating font-semibold tabular-nums",
			format: value => this.formatStat(value, "★", 1)
		}
	];

	protected readonly highlights = computed<HighlightDescriptor[]>(() => {
		const stats = this.stats();
		if (!stats) return [];
		return this.highlightDefinitions.flatMap(definition => {
			const entry = stats[definition.key];
			if (!this.isStatEnabled(definition.key) || !entry) return [];
			return [
				{
					key: definition.key,
					label: definition.label,
					valueClass: definition.valueClass,
					formattedValue: definition.format(entry.value),
					entry
				}
			];
		});
	});

	protected isStatEnabled(key: StatKey): boolean {
		return this.enabledStats().has(key);
	}

	protected hasAnyHighlightEnabled(): boolean {
		return HIGHLIGHT_STAT_KEYS.some(key => this.isStatEnabled(key));
	}

	protected hasAnyExpandedStatEnabled(): boolean {
		return EXPANDED_STAT_KEYS.some(key => this.isStatEnabled(key));
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
}
