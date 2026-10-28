import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

import {
	type RewindHighlights as RewindHighlightsData,
	type RewindTotals
} from "../../../../core/models/rewind.model";
import { GamePoster } from "../../../../shared/components/game-poster/game-poster";
import { StarRating } from "../../../../shared/components/star-rating/star-rating";
import { formatHours, monthName, pluralize } from "../../rewind-copy";

@Component({
	selector: "app-rewind-highlights",
	imports: [RouterLink, GamePoster, StarRating],
	templateUrl: "./rewind-highlights.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindHighlights {
	readonly highlights = input.required<RewindHighlightsData>();
	readonly totals = input.required<RewindTotals>();

	protected readonly formatHours = formatHours;
	protected readonly genreShare = computed(() => {
		const genre = this.highlights().favoriteGenre;
		return genre
			? `${genre.count} of ${pluralize(this.totals().finished, "game", "games")}`
			: "";
	});
	protected readonly platformRuns = computed(() => {
		const platform = this.highlights().topPlatform;
		return platform ? pluralize(platform.count, "run", "runs") : "";
	});
	protected readonly busiestMonthName = computed(() => {
		const month = this.highlights().busiestMonth;
		return month ? monthName(month.month) : "";
	});
	protected readonly busiestMonthCount = computed(() => {
		const month = this.highlights().busiestMonth;
		return month
			? `${pluralize(month.count, "game", "games")} finished`
			: "";
	});
}
