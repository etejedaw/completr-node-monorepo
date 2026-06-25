import {
	ChangeDetectionStrategy,
	Component,
	computed,
	signal
} from "@angular/core";
import { UiPagination } from "../../shared/ui";

type Tint = "brand" | "purple" | "warning" | "success" | "danger";

interface Highlight {
	icon: string;
	tint: Tint;
	text: string;
}

interface ReleaseEntry {
	date: string;
	tag: string;
	title: string;
	icon: string;
	tint: Tint;
	highlights: Highlight[];
}

const PAGE_SIZE = 4;

@Component({
	selector: "app-whats-new-page",
	imports: [UiPagination],
	template: `
		<div class="max-w-3xl mx-auto">
			<div class="mb-6 flex items-start gap-4">
				<span class="flex items-center justify-center w-12 h-12 rounded-2xl text-white shrink-0"
					style="background: linear-gradient(135deg, var(--color-brand), var(--color-brand-deep)); box-shadow: 0 10px 24px -8px var(--color-brand-glow);">
					<span class="material-icons text-[1.5rem]">campaign</span>
				</span>
				<div>
					<h1 class="font-display m-0 text-2xl md:text-3xl font-bold tracking-tight">What's new</h1>
					<p class="text-fg-muted mt-1 text-sm leading-snug">Recent updates and improvements to Completr</p>
				</div>
			</div>

			<div class="flex flex-col gap-4">
				@for (entry of pageEntries(); track entry.date + entry.title) {
					<article class="bg-sidebar border border-line rounded-card overflow-hidden">
						<header class="flex items-start gap-3 p-5 border-b border-line">
							<span class="flex items-center justify-center w-10 h-10 rounded-xl shrink-0" [class]="iconBgClass(entry.tint)">
								<span class="material-icons text-[1.25rem]">{{ entry.icon }}</span>
							</span>
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1 flex-wrap">
									<span class="inline-block px-2 py-0.5 rounded-full text-[0.625rem] font-bold uppercase tracking-wider" [class]="tagClass(entry.tint)">{{ entry.tag }}</span>
									<span class="text-[0.6875rem] text-fg-muted">{{ entry.date }}</span>
								</div>
								<h2 class="font-display m-0 text-base font-semibold text-fg leading-tight">{{ entry.title }}</h2>
							</div>
						</header>
						<ul class="m-0 list-none p-5 flex flex-col gap-3">
							@for (item of entry.highlights; track item.text) {
								<li class="flex items-start gap-2.5">
									<span class="flex items-center justify-center w-6 h-6 rounded-md shrink-0 mt-0.5" [class]="iconBgClass(item.tint)">
										<span class="material-icons text-[0.875rem]">{{ item.icon }}</span>
									</span>
									<span class="text-[0.8125rem] text-fg-secondary leading-relaxed">{{ item.text }}</span>
								</li>
							}
						</ul>
					</article>
				}
			</div>

			@if (releases.length > pageSize) {
				<div class="mt-6">
					<ui-pagination
						[offset]="offset()"
						[limit]="pageSize"
						[total]="releases.length"
						(offsetChange)="onOffsetChange($event)"
					/>
				</div>
			}

			<p class="text-center text-xs text-fg-muted mt-8 mb-0">
				Found a bug or have a suggestion?
				<a href="mailto:completr@etejeda.dev" class="text-brand no-underline hover:underline">Tell us</a>.
			</p>
		</div>
	`,
	host: { class: "block p-6" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class WhatsNewPage {
	protected readonly pageSize = PAGE_SIZE;
	protected readonly offset = signal(0);

	protected readonly releases: ReleaseEntry[] = [
		{
			date: "2026-06-25",
			tag: "Co-op",
			title: "Tag friends in co-op runs",
			icon: "group_add",
			tint: "brand",
			highlights: [
				{
					icon: "group",
					tint: "brand",
					text: "Tag friends you played a game with from the Tracking tab in the backlog modal. Each tag auto-creates a backlog for them (if they don't have one) with your critic score and duration prefilled, and links your runs into a shared session."
				},
				{
					icon: "sync",
					tint: "purple",
					text: "Each member sees a Sync button per peer. Pick exactly which objective fields to copy (status, started, finished, real duration) with a diff preview. Your personal data — score, rating, notes, mood tags, progress notes — is never touched."
				},
				{
					icon: "shield",
					tint: "success",
					text: "Privacy-aware: if a friend's backlog is private to you, the tag creates a fresh entry for them without touching their old runs. If you can see their library and they already have multiple runs, a picker lets you choose which one to annex or create a new one."
				}
			]
		},
		{
			date: "2026-06-25",
			tag: "Backlog",
			title: "Progress notes per run",
			icon: "bookmark",
			tint: "brand",
			highlights: [
				{
					icon: "bookmark",
					tint: "brand",
					text: "New 'Where I am' section in the backlog modal: leave short notes like 'Cap 3, stuck en el puzzle del agua' so you remember where you left off when you come back months later."
				},
				{
					icon: "history",
					tint: "purple",
					text: "Notes are append-only: each new entry preserves the previous one in a collapsible history. Delete any entry from the timeline. The latest note shows as a chip in the backlog rows for active runs."
				}
			]
		},
		{
			date: "2026-06-25",
			tag: "Tags",
			title: "Personal mood tags across your library",
			icon: "label",
			tint: "brand",
			highlights: [
				{
					icon: "label",
					tint: "brand",
					text: "Tag any game in your library with personal labels — relajante, podcast game, sesiones cortas, intenso, whatever helps you decide what to play next. Tags are per game, not per playthrough: rename one and every entry updates."
				},
				{
					icon: "filter_alt",
					tint: "purple",
					text: "Filter My Games by tag from the side panel — Backlog matches entries whose game has all the selected tags. Same filter persists in the URL so you can bookmark or share a tagged view."
				},
				{
					icon: "settings",
					tint: "success",
					text: "Manage all your tags from the new Tags page in the sidebar: create new tags (even before assigning them), rename them in bulk, add an optional description and delete safely with a confirmation modal."
				},
				{
					icon: "visibility",
					tint: "warning",
					text: "Tags show up everywhere you view a game: backlog rows, My Shelf, Up Next, Want to Get, Favorites and the game detail page — where you can add or edit them inline without opening any modal."
				}
			]
		},
		{
			date: "2026-06-25",
			tag: "Catalog",
			title: "Sort the catalog by rating, duration, ratio or popularity",
			icon: "sort",
			tint: "purple",
			highlights: [
				{
					icon: "star_rate",
					tint: "warning",
					text: "Sort the Games browse by canonical rating (Completr → Metacritic → OpenCritic → RAWG fallback) or canonical duration (Completr → HowLongToBeat → RAWG). Combine it with any of the existing filters."
				},
				{
					icon: "trending_up",
					tint: "brand",
					text: "New sort options: Ratio (best score per hour) and Popularity (most owned by Completr users). Popularity is recomputed by an admin job and reflects the real shelf counts across the community."
				},
				{
					icon: "star_border",
					tint: "warning",
					text: "Min and Max score in the filters panel now use the same star input as the backlog — pick half stars from 0 to 5 instead of typing decimals."
				}
			]
		},
		{
			date: "2026-06-25",
			tag: "Stats",
			title: "Pick which stats each saved view shows",
			icon: "tune",
			tint: "brand",
			highlights: [
				{
					icon: "checklist",
					tint: "brand",
					text: "Each saved view now stores its own set of visible stats. Open the Stats side panel from My Games and check or uncheck any of the 15 stat cards — your selection saves automatically and syncs across devices."
				},
				{
					icon: "restart_alt",
					tint: "purple",
					text: "Hit 'Reset to defaults' to clear your custom selection and bring back the default four KPIs. The stats panel hides itself entirely when no stat is enabled, so you can also use this as a quick way to dismiss it for a specific view."
				}
			]
		},
		{
			date: "2026-06-23",
			tag: "Shortcuts",
			title: "Quick actions on every game cover and drag to reorder",
			icon: "drag_indicator",
			tint: "purple",
			highlights: [
				{
					icon: "add_circle",
					tint: "brand",
					text: "Game covers across Favorites, My Shelf and other lists now expose two quick action buttons on hover: add to My Games (opens the backlog modal preloaded if you already have an entry) and toggle Want to Get — no need to open the game page anymore."
				},
				{
					icon: "drag_indicator",
					tint: "purple",
					text: "Up Next is now reorderable by drag-and-drop with an optimistic update — the new order shows right away and rolls back if the server rejects it."
				},
				{
					icon: "list",
					tint: "success",
					text: "List Detail also supports drag-and-drop reordering, visible only to the list owner. Positions persist on drop using the same endpoint that powered the old arrows."
				}
			]
		},
		{
			date: "2026-06-23",
			tag: "Stats",
			title: "Saved views now show backlog stats",
			icon: "insights",
			tint: "brand",
			highlights: [
				{
					icon: "bar_chart",
					tint: "brand",
					text: "Open any saved view from My Games and a new Stats panel appears above the list with the totals for that view: entries, real hours played, average ratio and average personal ratio."
				},
				{
					icon: "expand_more",
					tint: "purple",
					text: "Hit 'More' to unfold completion and abandonment rates, average score, rating, real vs estimated duration delta, and a status breakdown — all computed against the same filter as the list."
				},
				{
					icon: "emoji_events",
					tint: "warning",
					text: "Highlights cards surface the standouts of the view: longest played, best personal ratio and highest rated. Each links straight to the game page."
				}
			]
		},
		{
			date: "2026-06-21",
			tag: "Social",
			title: "Other Players on every game page",
			icon: "groups",
			tint: "brand",
			highlights: [
				{
					icon: "diversity_3",
					tint: "brand",
					text: "Game pages now show an 'Other Players' section with a randomized sample of up to 10 users who also have the game in their backlog — a quick way to discover folks outside your circle who share your taste."
				},
				{
					icon: "circle",
					tint: "success",
					text: "Each avatar carries a small colored dot for the most recent status (Completed, Playing, Abandoned, Endless or Backlog). Hover or tap shows the name and status."
				},
				{
					icon: "shuffle",
					tint: "purple",
					text: "Friends you already follow stay in the 'Played by Friends' section above — Other Players excludes them to avoid duplicates. The sample reshuffles every visit."
				}
			]
		},
		{
			date: "2026-06-21",
			tag: "Privacy",
			title: "Follow requests inbox and clearer privacy settings",
			icon: "person_add",
			tint: "success",
			highlights: [
				{
					icon: "campaign",
					tint: "success",
					text: "Pending follow requests now show as a highlighted card at the top of your feed with one-click Accept / Reject — only you see it, and the same list also lives in Settings → Privacy."
				},
				{
					icon: "schedule",
					tint: "warning",
					text: "Follow button on private profiles now has three states: Follow → Requested (click again to cancel) → Following. No more guessing whether your request went through."
				},
				{
					icon: "toggle_on",
					tint: "brand",
					text: "New 'Allow follow requests' toggle on Privacy settings (only when your profile is Private). Switch it off and the Follow button disappears from your profile."
				},
				{
					icon: "tune",
					tint: "purple",
					text: "Privacy dropdowns replaced by segmented controls (Only you / Friends / Everyone) with icons and tooltips, plus a legend explaining each level — especially what 'Friends' means (mutual follow)."
				}
			]
		},
		{
			date: "2026-06-19",
			tag: "Privacy",
			title: "Friends-level privacy and follow requests",
			icon: "lock",
			tint: "purple",
			highlights: [
				{
					icon: "tune",
					tint: "purple",
					text: "Privacy settings get a new Friends preset and a Custom mode where every section (My Games, My Shelf, Lists, Up Next, Wanted, Favorites, Activity feed) can be set to Only you / Friends / Everyone independently."
				},
				{
					icon: "group",
					tint: "brand",
					text: "Friend = mutual follower. When a section is set to Friends, only users that follow each other with you can see it."
				},
				{
					icon: "person_add",
					tint: "success",
					text: "Private profiles now gate new followers behind a request — accept or reject from the new follow requests panel. Toggle it off and the Follow button hides again."
				}
			]
		},
		{
			date: "2026-06-19",
			tag: "Catalog",
			title: "Subgenres promoted from RAWG tags",
			icon: "category",
			tint: "warning",
			highlights: [
				{
					icon: "label",
					tint: "warning",
					text: "Filtering Games by Point and Click, Roguelike, Metroidvania, Soulslike, Visual Novel, Deck Building and other subgenres now returns results — these used to be RAWG tags and were ignored at import time."
				},
				{
					icon: "auto_fix_high",
					tint: "brand",
					text: "11 new genres seeded: Point and Click, Roguelike, Roguelite, Metroidvania, Soulslike, Visual Novel, Deck Building, Battle Royale, Survival Horror, Dungeon Crawler, Auto Battler."
				},
				{
					icon: "refresh",
					tint: "purple",
					text: "Newly imported games pick up these subgenres automatically. Existing games update on the next natural refresh."
				}
			]
		},
		{
			date: "2026-06-18",
			tag: "Profile",
			title: "Profile restructure: Highlights first, activity timeline at the bottom",
			icon: "person",
			tint: "brand",
			highlights: [
				{
					icon: "insights",
					tint: "brand",
					text: "Public profiles now open on Highlights by default instead of Backlog — recent completions and the monthly summary lead the page."
				},
				{
					icon: "dynamic_feed",
					tint: "purple",
					text: "Recent Activity moved from the side to the bottom of the profile as a timeline with icons per activity type, plus a sidebar with recent followers."
				},
				{
					icon: "rate_review",
					tint: "success",
					text: "Reviews counter on the stats grid now shows the real total instead of capping at the preview size."
				}
			]
		},
		{
			date: "2026-06-18",
			tag: "Highlights",
			title: "Browse past months and see every completion",
			icon: "calendar_month",
			tint: "purple",
			highlights: [
				{
					icon: "chevron_left",
					tint: "brand",
					text: "Arrows around the month title in Highlights to navigate to previous months — Most played and Highest rated recalculate per month, with the URL keeping the selection (?highlightsMonth=YYYY-MM)."
				},
				{
					icon: "check_circle",
					tint: "success",
					text: "New 'See all' link under Recent completions opens a dedicated timeline view at /user/:username/completions with score, real duration, finish date and an excerpt of your review."
				}
			]
		},
		{
			date: "2026-06-18",
			tag: "Social",
			title: "Cleaner feed and reviews that count rating-only entries",
			icon: "filter_alt",
			tint: "success",
			highlights: [
				{
					icon: "person_off",
					tint: "purple",
					text: "Follow activities (X started following Y) no longer leak into the feed or someone else's activity timeline — they stay scoped to the owner."
				},
				{
					icon: "star",
					tint: "warning",
					text: "Reviews lists now include entries with only a score (no written text) on the profile and the dedicated reviews view."
				}
			]
		},
		{
			date: "2026-06-18",
			tag: "Lists",
			title: "Compare your progress with the list owner",
			icon: "compare_arrows",
			tint: "warning",
			highlights: [
				{
					icon: "visibility",
					tint: "brand",
					text: "When you open a list from another user's profile, a banner makes it clear whose progress you're seeing and lets you switch back to yours in one click."
				},
				{
					icon: "compare_arrows",
					tint: "warning",
					text: "New Compare mode shows both progresses side by side — two bars at the top and 'You / @user' status pills per item."
				}
			]
		},
		{
			date: "2026-06-17",
			tag: "UX overhaul",
			title: "Naming, onboarding and library overhaul",
			icon: "auto_fix_high",
			tint: "brand",
			highlights: [
				{
					icon: "edit",
					tint: "brand",
					text: "Backlog renamed to My Games, Queue to Up Next, Wishlist to Want to Get, Game Shelf to My Shelf."
				},
				{
					icon: "view_sidebar",
					tint: "purple",
					text: "Sidebar regrouped into Library and Discover with hover tooltips per item."
				},
				{
					icon: "tour",
					tint: "warning",
					text: "New onboarding tour at first login (skippable, accessible from Help anytime)."
				},
				{
					icon: "lightbulb",
					tint: "success",
					text: "Empty states across every section now explain what they're for and how they differ from each other."
				}
			]
		},
		{
			date: "2026-06-17",
			tag: "New features",
			title: "Endless games and richer backlog filters",
			icon: "all_inclusive",
			tint: "purple",
			highlights: [
				{
					icon: "all_inclusive",
					tint: "brand",
					text: "New backlog status: Endless — for games like Vampire Survivors or Tetris that don't have a natural completion. Tracks rating and review without distorting completion metrics."
				},
				{
					icon: "tune",
					tint: "purple",
					text: "Advanced filter mode in My Games: filter by genre, multi-platform, release year, real duration, ratio and personal ratio."
				},
				{
					icon: "star",
					tint: "warning",
					text: "Inline favorite star added across My Games, Up Next, My Shelf and Want to Get."
				}
			]
		},
		{
			date: "2026-06-17",
			tag: "Polish",
			title: "Profile highlights and better forms",
			icon: "insights",
			tint: "success",
			highlights: [
				{
					icon: "insights",
					tint: "success",
					text: "New Highlights tab on public profiles showing recent completions and a monthly summary (most played, highest rated)."
				},
				{
					icon: "error_outline",
					tint: "danger",
					text: "Validation errors now appear inline per field across admin forms — no more generic 'invalid request'."
				},
				{
					icon: "undo",
					tint: "purple",
					text: "Undo button when removing entries from the feed."
				}
			]
		}
	];

	protected readonly pageEntries = computed(() =>
		this.releases.slice(this.offset(), this.offset() + this.pageSize)
	);

	protected onOffsetChange(offset: number) {
		this.offset.set(offset);
		if (typeof window !== "undefined") {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	}

	protected iconBgClass(tint: Tint): string {
		switch (tint) {
			case "brand":
				return "bg-brand-subtle text-brand";
			case "purple":
				return "bg-[rgba(168,85,247,0.15)] text-[#a855f7]";
			case "warning":
				return "bg-warning/15 text-warning";
			case "success":
				return "bg-success/15 text-success";
			case "danger":
				return "bg-danger/15 text-danger";
		}
	}

	protected tagClass(tint: Tint): string {
		switch (tint) {
			case "brand":
				return "bg-brand-subtle text-brand";
			case "purple":
				return "bg-[rgba(168,85,247,0.15)] text-[#a855f7]";
			case "warning":
				return "bg-warning/15 text-warning";
			case "success":
				return "bg-success/15 text-success";
			case "danger":
				return "bg-danger/15 text-danger";
		}
	}
}
