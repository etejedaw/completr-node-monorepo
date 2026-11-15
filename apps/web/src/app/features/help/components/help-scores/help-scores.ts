import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { type SectionScrollSpy } from "../../../../shared/components/page-toc/section-scroll-spy";
import { InView } from "../../../../shared/directives/in-view";
import { UiEyebrow } from "../../../../shared/ui";
import { type CanonicalScore } from "../../../../shared/utils/canonical-score.model";
import { GameScoreCard } from "../../../games/game-detail/components/game-score-card";

const SCORE_EXAMPLES: readonly CanonicalScore[] = [
	{ type: "completr", score: 4.4, scoreScale: 5, duration: 9.5, ratio: 9.26 },
	{ type: "aggregate", score: 88, scoreScale: 100, duration: 10, ratio: 8.8 },
	{ type: "rawg", score: 4.1, scoreScale: 5, duration: 12, ratio: 6.83 }
];

@Component({
	selector: "app-help-scores",
	imports: [GameScoreCard, InView, UiEyebrow],
	templateUrl: "./help-scores.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpScores {
	protected readonly scoreExamples = SCORE_EXAMPLES;
	readonly scrollSpy = input.required<SectionScrollSpy>();
}
