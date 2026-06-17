import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
	selector: "app-about-page",
	standalone: true,
	template: `
		<div class="max-w-2xl mx-auto">
			<div class="mb-6">
				<h1 class="font-display m-0 text-2xl md:text-3xl font-bold tracking-tight">About Completr</h1>
				<p class="text-fg-muted mt-1 text-xs">Credits, sources and technical details</p>
			</div>

			<div class="bg-sidebar border border-line rounded-card p-6 mb-4">
				<h2 class="font-display m-0 mb-3 text-base font-semibold text-fg">Data sources</h2>
				<p class="m-0 text-sm text-fg-secondary leading-relaxed">
					Game data and images come from
					<a href="https://rawg.io" target="_blank" rel="noopener" class="text-brand no-underline hover:underline">RAWG.io</a>,
					completion-time estimates from
					<a href="https://howlongtobeat.com" target="_blank" rel="noopener" class="text-brand no-underline hover:underline">HowLongToBeat</a>,
					and aggregated critic scores from
					<a href="https://www.metacritic.com" target="_blank" rel="noopener" class="text-brand no-underline hover:underline">Metacritic</a>,
					<a href="https://opencritic.com" target="_blank" rel="noopener" class="text-brand no-underline hover:underline">OpenCritic</a>
					and IGDB. Used under each provider's API terms.
				</p>
			</div>

			<div class="bg-sidebar border border-line rounded-card p-6 mb-4">
				<h2 class="font-display m-0 mb-3 text-base font-semibold text-fg">Stack</h2>
				<ul class="m-0 pl-5 text-sm text-fg-secondary leading-relaxed space-y-1">
					<li>Frontend: Angular 20, Tailwind CSS, signals-based reactivity.</li>
					<li>Backend: Node.js + Express + Sequelize on PostgreSQL.</li>
					<li>Auth: JWT with refresh tokens.</li>
					<li>Validation: Zod schemas at every boundary.</li>
				</ul>
			</div>

			<div class="bg-sidebar border border-line rounded-card p-6">
				<h2 class="font-display m-0 mb-3 text-base font-semibold text-fg">Built by</h2>
				<p class="m-0 text-sm text-fg-secondary leading-relaxed">
					Completr is built and maintained by a solo developer who got tired of tracking games in spreadsheets.
					Feedback, bug reports and feature requests are welcome at
					<a href="mailto:hi@completr.app" class="text-brand no-underline hover:underline">hi&#64;completr.app</a>.
				</p>
			</div>
		</div>
	`,
	host: { class: "block p-6" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutPage {}
