import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";

import { NAV_SECTIONS } from "../../../../layout/nav-sections";
import { type NavItem } from "../../../../layout/nav-sections.model";
import { type SectionScrollSpy } from "../../../../shared/components/page-toc/section-scroll-spy";
import { InView } from "../../../../shared/directives/in-view";
import { UiEyebrow } from "../../../../shared/ui";

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
		route: "/platinums",
		text: "Every game you finished at 100%, one platinum per game. Mark it from Edit run, the quick status dialog or the game page, and link it to the run where you got it."
	},
	{
		route: "/lists",
		text: "Curated collections you build and share: sagas, rankings, challenges. Other players can follow them."
	},
	{
		route: "/franchises",
		text: "A page in Discover to browse and search the catalog's game sagas, like Resident Evil or Zelda. Track the ones you follow and they show up on your profile."
	},
	{
		route: "/tags",
		text: "Your own labels, like cozy or co-op. When at least 2 players use the same tag on a game it shows up there for everyone, without saying who added it. Filter My Games by your tags or the community's, find games by tag from the search, and pick up to 5 favorites for your profile."
	}
];

const NAV_ITEMS_BY_ROUTE = new Map<string, NavItem>(
	NAV_SECTIONS.flatMap(section => section.items).map(item => [
		item.route,
		item
	])
);

@Component({
	selector: "app-help-collection",
	imports: [RouterLink, InView, UiEyebrow],
	templateUrl: "./help-collection.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpCollection {
	protected readonly collection = COLLECTION_GUIDE.map(entry => ({
		...entry,
		nav: NAV_ITEMS_BY_ROUTE.get(entry.route)
	}));
	readonly scrollSpy = input.required<SectionScrollSpy>();
}
