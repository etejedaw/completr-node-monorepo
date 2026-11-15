import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { BacklogStatusBadge } from "../../../../shared/components/backlog-status-badge/backlog-status-badge";
import { GamePoster } from "../../../../shared/components/game-poster/game-poster";
import { type SectionScrollSpy } from "../../../../shared/components/page-toc/section-scroll-spy";
import { RatioSummary } from "../../../../shared/components/ratio-summary/ratio-summary";
import { StarRating } from "../../../../shared/components/star-rating/star-rating";
import { InView } from "../../../../shared/directives/in-view";
import { UiEyebrow } from "../../../../shared/ui";

@Component({
	selector: "app-help-runs",
	imports: [
		BacklogStatusBadge,
		GamePoster,
		RatioSummary,
		StarRating,
		InView,
		UiEyebrow
	],
	templateUrl: "./help-runs.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpRuns {
	readonly scrollSpy = input.required<SectionScrollSpy>();
}
