import { ChangeDetectionStrategy, Component, inject } from "@angular/core";

import { OnboardingService } from "../../core/services/onboarding";
import { InfoPageLinks } from "../../shared/components/info-page-links/info-page-links";
import { LibraryHero } from "../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../shared/components/library-toolbar/library-toolbar";
import { PageToc } from "../../shared/components/page-toc/page-toc";
import { type PageSection } from "../../shared/components/page-toc/page-toc.model";
import { injectSectionScrollSpy } from "../../shared/components/page-toc/section-scroll-spy";
import { InView } from "../../shared/directives/in-view";
import { UiButton } from "../../shared/ui";
import { injectLibraryPosters } from "../backlog/library-posters";
import { HelpCollection } from "./components/help-collection/help-collection";
import { HelpPrivacy } from "./components/help-privacy/help-privacy";
import { HelpRatio } from "./components/help-ratio/help-ratio";
import { HelpRewind } from "./components/help-rewind/help-rewind";
import { HelpRuns } from "./components/help-runs/help-runs";
import { HelpSavedViews } from "./components/help-saved-views/help-saved-views";
import { HelpScores } from "./components/help-scores/help-scores";
import { HelpStatuses } from "./components/help-statuses/help-statuses";

const SECTIONS: readonly PageSection[] = [
	{ id: "runs", label: "Runs", icon: "list_alt" },
	{ id: "ratio", label: "Ratio", icon: "trending_up" },
	{ id: "scores", label: "Scores", icon: "leaderboard" },
	{ id: "statuses", label: "Statuses", icon: "flag" },
	{ id: "collection", label: "Collection", icon: "shelves" },
	{ id: "saved-views", label: "Saved Views", icon: "bookmark" },
	{ id: "rewind", label: "Rewind", icon: "history" },
	{ id: "privacy", label: "Privacy", icon: "shield" }
];

@Component({
	selector: "app-help-page",
	imports: [
		LibraryHero,
		LibraryToolbar,
		PageToc,
		InView,
		InfoPageLinks,
		UiButton,
		HelpRuns,
		HelpRatio,
		HelpScores,
		HelpStatuses,
		HelpCollection,
		HelpSavedViews,
		HelpRewind,
		HelpPrivacy
	],
	templateUrl: "./help-page.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpPage {
	private readonly onboarding = inject(OnboardingService);

	protected readonly posters = injectLibraryPosters();
	protected readonly sections = SECTIONS;
	protected readonly scrollSpy = injectSectionScrollSpy(SECTIONS);

	protected openTour() {
		this.onboarding.open();
	}
}
