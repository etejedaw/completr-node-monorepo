import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";

import { type SectionScrollSpy } from "../../../../shared/components/page-toc/section-scroll-spy";
import { InView } from "../../../../shared/directives/in-view";
import { UiButton, UiEyebrow } from "../../../../shared/ui";

@Component({
	selector: "app-help-saved-views",
	imports: [RouterLink, InView, UiButton, UiEyebrow],
	templateUrl: "./help-saved-views.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpSavedViews {
	readonly scrollSpy = input.required<SectionScrollSpy>();
}
