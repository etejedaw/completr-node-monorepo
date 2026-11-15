import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { GamePoster } from "../../../../shared/components/game-poster/game-poster";
import { type SectionScrollSpy } from "../../../../shared/components/page-toc/section-scroll-spy";
import { RatioSummary } from "../../../../shared/components/ratio-summary/ratio-summary";
import { InView } from "../../../../shared/directives/in-view";
import { UiEyebrow, UiProgress } from "../../../../shared/ui";

@Component({
	selector: "app-help-ratio",
	imports: [GamePoster, RatioSummary, InView, UiEyebrow, UiProgress],
	templateUrl: "./help-ratio.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpRatio {
	readonly scrollSpy = input.required<SectionScrollSpy>();
}
