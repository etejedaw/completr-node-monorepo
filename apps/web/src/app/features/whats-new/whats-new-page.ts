import { ChangeDetectionStrategy, Component } from "@angular/core";

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

@Component({
	selector: "app-whats-new-page",
	standalone: true,
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
				@for (entry of releases; track entry.date + entry.title) {
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

			<p class="text-center text-xs text-fg-muted mt-8 mb-0">
				Found a bug or have a suggestion?
				<a href="mailto:hi@completr.app" class="text-brand no-underline hover:underline">Tell us</a>.
			</p>
		</div>
	`,
	host: { class: "block p-6" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class WhatsNewPage {
	protected readonly releases: ReleaseEntry[] = [
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
