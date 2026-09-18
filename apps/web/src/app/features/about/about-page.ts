import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";

type Tint = "brand" | "purple" | "warning" | "success";

interface InfoCard {
	icon: string;
	tint: Tint;
	title: string;
	body: string;
}

@Component({
	selector: "app-about-page",
	imports: [RouterLink],
	template: `
		<div class="max-w-3xl mx-auto">
			<div class="mb-6 flex items-start gap-4">
				<span
					class="flex items-center justify-center w-12 h-12 rounded-2xl text-white shrink-0"
					style="background: linear-gradient(135deg, var(--color-brand), var(--color-brand-deep)); box-shadow: 0 10px 24px -8px var(--color-brand-glow);"
				>
					<span class="material-icons text-[1.5rem]"
						>videogame_asset</span
					>
				</span>
				<div>
					<h1
						class="font-display m-0 text-2xl md:text-3xl font-bold tracking-tight"
					>
						About Completr
					</h1>
					<p class="text-fg-muted mt-1 text-sm leading-snug">
						A game backlog tracker with ratio-based prioritization —
						like Trakt or Letterboxd, but for video games.
					</p>
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				@for (card of cards; track card.title) {
					<div
						class="bg-sidebar border border-line rounded-card p-5 flex flex-col gap-2"
					>
						<div class="flex items-center gap-2.5">
							<span
								class="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
								[class]="tintClass(card.tint)"
							>
								<span class="material-icons text-[1.125rem]">{{
									card.icon
								}}</span>
							</span>
							<h2
								class="font-display m-0 text-sm font-semibold text-fg"
							>
								{{ card.title }}
							</h2>
						</div>
						<p
							class="m-0 text-[0.8125rem] text-fg-secondary leading-relaxed"
							[innerHTML]="card.body"
						></p>
					</div>
				}
			</div>

			<div
				class="mt-6 bg-sidebar border border-line rounded-card p-5 flex items-center gap-4"
			>
				<span
					class="flex items-center justify-center w-11 h-11 rounded-full bg-brand-subtle text-brand shrink-0"
				>
					<span class="material-icons">favorite</span>
				</span>
				<div class="flex-1 min-w-0">
					<div class="text-sm font-semibold text-fg">
						Built solo, one bug at a time
					</div>
					<div class="text-xs text-fg-muted leading-snug mt-0.5">
						Feedback, bug reports and feature ideas welcome —
						<a
							href="mailto:completr@etejeda.dev"
							class="text-brand no-underline hover:underline"
							>completr&#64;etejeda.dev</a
						>.
					</div>
				</div>
			</div>
			<p class="mt-4 text-center text-xs text-fg-muted">
				<a
					routerLink="/privacy"
					class="text-fg-secondary no-underline hover:text-brand"
					>Privacy Policy</a
				>
			</p>
		</div>
	`,
	host: { class: "block p-6" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutPage {
	protected readonly cards: InfoCard[] = [
		{
			icon: "person",
			tint: "brand",
			title: "Crafted by",
			body: '<a href="https://www.etejeda.dev" target="_blank" rel="noopener" class="text-brand no-underline hover:underline">Esteban Tejeda</a>'
		},
		{
			icon: "code",
			tint: "purple",
			title: "Stack",
			body: "Angular 22 (signals) · Tailwind CSS · Node + Express · PostgreSQL + Sequelize · Zod everywhere"
		},
		{
			icon: "storage",
			tint: "warning",
			title: "Data sources",
			body: '<a href="https://rawg.io" target="_blank" rel="noopener" class="text-brand no-underline hover:underline">RAWG</a> · <a href="https://howlongtobeat.com" target="_blank" rel="noopener" class="text-brand no-underline hover:underline">HowLongToBeat</a> · <a href="https://www.metacritic.com" target="_blank" rel="noopener" class="text-brand no-underline hover:underline">Metacritic</a>'
		},
		{
			icon: "lock_open",
			tint: "success",
			title: "Open source",
			body: "Licensed under AGPL-3.0. Self-host friendly."
		}
	];

	protected tintClass(tint: Tint): string {
		switch (tint) {
			case "brand":
				return "bg-brand-subtle text-brand";
			case "purple":
				return "bg-[rgba(168,85,247,0.15)] text-[#a855f7]";
			case "warning":
				return "bg-warning/15 text-warning";
			case "success":
				return "bg-success/15 text-success";
		}
	}
}
