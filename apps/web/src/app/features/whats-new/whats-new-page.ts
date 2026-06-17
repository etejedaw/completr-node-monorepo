import { ChangeDetectionStrategy, Component } from "@angular/core";

interface ReleaseEntry {
	date: string;
	title: string;
	highlights: string[];
}

@Component({
	selector: "app-whats-new-page",
	standalone: true,
	template: `
		<div class="max-w-2xl mx-auto">
			<div class="mb-6">
				<h1 class="font-display m-0 text-2xl md:text-3xl font-bold tracking-tight">What's new</h1>
				<p class="text-fg-muted mt-1 text-xs">Recent updates and improvements</p>
			</div>

			<div class="flex flex-col gap-4">
				@for (entry of releases; track entry.date + entry.title) {
					<article class="bg-sidebar border border-line rounded-card p-5">
						<div class="flex items-baseline justify-between gap-3 mb-2">
							<h2 class="font-display m-0 text-base font-semibold text-fg">{{ entry.title }}</h2>
							<span class="text-[0.6875rem] text-fg-muted whitespace-nowrap">{{ entry.date }}</span>
						</div>
						<ul class="m-0 pl-5 text-sm text-fg-secondary leading-relaxed space-y-1.5">
							@for (item of entry.highlights; track item) {
								<li>{{ item }}</li>
							}
						</ul>
					</article>
				}
			</div>

			<p class="text-center text-xs text-fg-muted mt-6 mb-0">
				That's all the recent news. Found a bug or have a suggestion?
				<a href="mailto:hi@completr.app" class="text-brand no-underline hover:underline">Let us know</a>.
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
			title: "Naming, onboarding and library overhaul",
			highlights: [
				"Backlog renamed to My Games, Queue to Up Next, Wishlist to Want to Get, Game Shelf to My Shelf.",
				"Sidebar regrouped into Library and Discover with hover tooltips per item.",
				"New onboarding tour at first login (skippable, accessible from Help anytime).",
				"Empty states across every section now explain what they're for and how they differ from each other."
			]
		},
		{
			date: "2026-06-17",
			title: "Endless games and richer backlog filters",
			highlights: [
				"New backlog status: Endless — for games like Vampire Survivors or Tetris that don't have a natural completion. Tracks rating and review without distorting completion metrics.",
				"Advanced filter mode in My Games: filter by genre, multi-platform, release year, real duration, ratio and personal ratio.",
				"Inline favorite star added across My Games, Up Next, My Shelf and Want to Get."
			]
		},
		{
			date: "2026-06-17",
			title: "Profile highlights and better forms",
			highlights: [
				"New Highlights tab on public profiles showing recent completions and a monthly summary (most played, highest rated).",
				"Validation errors now appear inline per field across admin forms — no more generic 'invalid request'.",
				"Undo button when removing entries from the feed."
			]
		}
	];
}
