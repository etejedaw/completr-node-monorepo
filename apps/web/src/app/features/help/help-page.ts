import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	DOCUMENT,
	inject,
	signal
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";

import { type BacklogStatus } from "../../core/models";
import { OnboardingService } from "../../core/services/onboarding";
import { NAV_SECTIONS, type NavItem } from "../../layout/nav-sections";
import { GamePoster } from "../../shared/components/game-poster/game-poster";
import { InfoPageLinks } from "../../shared/components/info-page-links/info-page-links";
import { LibraryHero } from "../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../shared/components/library-toolbar/library-toolbar";
import { RatioSummary } from "../../shared/components/ratio-summary/ratio-summary";
import { StarRating } from "../../shared/components/star-rating/star-rating";
import { InView } from "../../shared/directives/in-view";
import { UiButton } from "../../shared/ui";
import {
	backlogStatusClass,
	backlogStatusIcon,
	backlogStatusLabel
} from "../../shared/utils/backlog-status";
import { type CanonicalScore } from "../../shared/utils/canonical-score";
import { injectLibraryPosters } from "../backlog/library-posters";
import { GameScoreCard } from "../games/game-detail/components/game-score-card";
import { type HelpSection, HelpToc } from "./components/help-toc";

const PROGRAMMATIC_SCROLL_MS = 1000;

const SECTIONS: readonly HelpSection[] = [
	{ id: "runs", label: "Runs", icon: "list_alt" },
	{ id: "ratio", label: "Ratio", icon: "trending_up" },
	{ id: "scores", label: "Scores", icon: "leaderboard" },
	{ id: "statuses", label: "Statuses", icon: "flag" },
	{ id: "collection", label: "Collection", icon: "shelves" },
	{ id: "saved-views", label: "Saved Views", icon: "bookmark" },
	{ id: "privacy", label: "Privacy", icon: "shield" }
];

const STATUS_GUIDE: readonly { status: BacklogStatus; text: string }[] = [
	{
		status: "not_started",
		text: "You have it lined up but haven't pressed start."
	},
	{ status: "playing", text: "In progress right now." },
	{
		status: "completed",
		text: "Finished. Unlocks your personal ratio and your review."
	},
	{ status: "abandoned", text: "Dropped. You can note why." },
	{
		status: "endless",
		text: "No real ending: multiplayer, roguelikes, live games."
	}
];

const COLLECTION_GUIDE: readonly { route: string; text: string }[] = [
	{
		route: "/queue",
		text: "The short list of runs you'll play next, in your order. A run leaves it on its own when you start, finish or drop it."
	},
	{
		route: "/game-shelf",
		text: "What you actually own, physical or digital, with platform, edition and the date you got it."
	},
	{
		route: "/wishlist",
		text: "Games you'd like to get but don't own yet, optionally tagged with a platform."
	},
	{
		route: "/favorites",
		text: "Your all-time top games, ranked. Any game can be a favorite, played or not."
	},
	{
		route: "/lists",
		text: "Curated collections you build and share: sagas, rankings, challenges. Other players can follow them."
	},
	{
		route: "/tags",
		text: "Your own labels, like cozy or co-op, to slice My Games however you like."
	}
];

const NAV_ITEMS_BY_ROUTE = new Map<string, NavItem>(
	NAV_SECTIONS.flatMap(section => section.items).map(item => [
		item.route,
		item
	])
);

const SCORE_EXAMPLES: readonly CanonicalScore[] = [
	{ type: "completr", score: 4.4, scoreScale: 5, duration: 9.5, ratio: 9.26 },
	{ type: "aggregate", score: 88, scoreScale: 100, duration: 10, ratio: 8.8 },
	{ type: "rawg", score: 4.1, scoreScale: 5, duration: 12, ratio: 6.83 }
];

@Component({
	selector: "app-help-page",
	imports: [
		RouterLink,
		LibraryHero,
		LibraryToolbar,
		HelpToc,
		InView,
		GamePoster,
		RatioSummary,
		StarRating,
		GameScoreCard,
		InfoPageLinks,
		UiButton
	],
	templateUrl: "./help-page.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpPage {
	private readonly onboarding = inject(OnboardingService);
	private readonly route = inject(ActivatedRoute);
	private readonly document = inject(DOCUMENT);

	protected readonly posters = injectLibraryPosters();
	protected readonly sections = SECTIONS;
	protected readonly statuses = STATUS_GUIDE;
	protected readonly scoreExamples = SCORE_EXAMPLES;
	protected readonly collection = COLLECTION_GUIDE.map(entry => ({
		...entry,
		nav: NAV_ITEMS_BY_ROUTE.get(entry.route)
	}));
	protected readonly active = signal(SECTIONS[0]!.id);
	private followScrollAfter = 0;
	private atPageEnd = false;
	private sectionInReadingBand: string = SECTIONS[0]!.id;

	protected readonly statusClass = backlogStatusClass;
	protected readonly statusIcon = backlogStatusIcon;
	protected readonly statusLabel = backlogStatusLabel;

	constructor() {
		afterNextRender(() => {
			const fragment = this.route.snapshot.fragment;
			if (fragment) this.scrollTo(fragment, "auto");
		});
	}

	protected openTour() {
		this.onboarding.open();
	}

	protected onSectionInView(id: string, inView: boolean) {
		if (inView) this.sectionInReadingBand = id;
		this.syncActiveWithScroll();
	}

	protected onEndInView(inView: boolean) {
		this.atPageEnd = inView;
		this.syncActiveWithScroll();
	}

	private syncActiveWithScroll() {
		if (Date.now() < this.followScrollAfter) return;
		this.active.set(
			this.atPageEnd ? SECTIONS.at(-1)!.id : this.sectionInReadingBand
		);
	}

	protected scrollTo(id: string, behavior?: ScrollBehavior) {
		const target = this.document.getElementById(id);
		if (!target) return;
		const reduceMotion = this.document.defaultView?.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches;
		this.followScrollAfter = Date.now() + PROGRAMMATIC_SCROLL_MS;
		target.scrollIntoView({
			behavior: behavior ?? (reduceMotion ? "auto" : "smooth"),
			block: "start"
		});
		this.active.set(id);
	}
}
