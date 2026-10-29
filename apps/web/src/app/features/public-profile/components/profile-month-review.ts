import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import { CoverUrlPipe } from "../../../shared/pipes/cover-url";
import { type HighlightEntry } from "../services/public-reviews.model";
import { type MonthHighlight } from "./profile-month-review.model";

function formatNumber(value: number, decimals: number): string {
	return value.toFixed(decimals).replace(/\.?0+$/, "");
}

@Component({
	selector: "app-profile-month-review",
	imports: [RouterLink, GamePoster, CoverUrlPipe],
	templateUrl: "./profile-month-review.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileMonthReview {
	readonly monthLabel = input.required<string>();
	readonly completedCount = input(0);
	readonly longestPlayed = input<HighlightEntry | null>(null);
	readonly bestPersonalRatio = input<HighlightEntry | null>(null);
	readonly highestRated = input<HighlightEntry | null>(null);
	readonly canGoNext = input(false);
	readonly loading = input(false);

	readonly previousMonth = output<void>();
	readonly nextMonth = output<void>();

	protected readonly highlights = computed<MonthHighlight[]>(() => {
		const longestPlayed = this.longestPlayed();
		const bestPersonalRatio = this.bestPersonalRatio();
		const highestRated = this.highestRated();
		return [
			{
				key: "longestPlayed",
				label: "Longest played",
				icon: "schedule",
				emptyIcon: "schedule",
				labelClass: "text-info",
				emptyText: "No playtime logged",
				entry: longestPlayed,
				value: longestPlayed?.realDuration
					? `${formatNumber(longestPlayed.realDuration, 1)}h played`
					: null
			},
			{
				key: "bestPersonalRatio",
				label: "Best personal ratio",
				icon: "bolt",
				emptyIcon: "bolt",
				labelClass: "text-brand",
				emptyText: "No ratio this month",
				entry: bestPersonalRatio,
				value:
					bestPersonalRatio?.personalRatio != null
						? `${formatNumber(bestPersonalRatio.personalRatio, 2)} ratio`
						: null
			},
			{
				key: "highestRated",
				label: "Highest rated",
				icon: "star",
				emptyIcon: "star_border",
				labelClass: "text-rating",
				emptyText: "No ratings this month",
				entry: highestRated,
				value: highestRated?.userRating
					? `★ ${highestRated.userRating}`
					: null
			}
		];
	});
}
