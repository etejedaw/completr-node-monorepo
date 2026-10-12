import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import { CoverUrlPipe } from "../../../shared/pipes/cover-url";
import { type HighlightEntry } from "../services/public-reviews.service";

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
	readonly mostPlayed = input<HighlightEntry | null>(null);
	readonly highestRated = input<HighlightEntry | null>(null);
	readonly canGoNext = input(false);
	readonly loading = input(false);

	readonly previousMonth = output<void>();
	readonly nextMonth = output<void>();
}
