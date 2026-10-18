import { ChangeDetectionStrategy, Component, computed } from "@angular/core";

import { AppLogo } from "../../../shared/components/app-logo/app-logo";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import { injectShowcaseGames } from "../showcase-games";

interface ShowcasePoster {
	src: string | null;
	title: string;
}

const COLUMN_COUNT = 7;
const POSTERS_PER_COLUMN = 6;

const FALLBACK_TITLES = [
	"Hollow Tide",
	"Neon Drift",
	"Ashen Crown",
	"Starlit Forge",
	"Pale Orchard",
	"Iron Lullaby",
	"Echo Valley",
	"Crimson Atlas",
	"Velvet Circuit",
	"Moss & Marrow",
	"Glass Harbor",
	"Sunken Choir",
	"Quiet Comet",
	"Rust Garden",
	"Paper Knights",
	"Lantern Deep"
];

const FALLBACK_POSTERS: ShowcasePoster[] = FALLBACK_TITLES.map(title => ({
	src: null,
	title
}));

const FALLBACK_FEATURED = {
	src: null,
	title: "Hollow Tide",
	score: 4.6,
	hours: 12,
	ratio: 8.4
};

function distributeInColumns(posters: ShowcasePoster[]): ShowcasePoster[][] {
	return Array.from({ length: COLUMN_COUNT }, (_, column) => {
		const columnPosters = Array.from(
			{ length: POSTERS_PER_COLUMN },
			(_, row) =>
				posters[(column * POSTERS_PER_COLUMN + row) % posters.length]!
		);
		return [...columnPosters, ...columnPosters];
	});
}

@Component({
	selector: "app-auth-showcase",
	imports: [AppLogo, GamePoster],
	template: `
		<div
			aria-hidden="true"
			class="absolute inset-0 flex gap-3 sm:gap-4 justify-center -rotate-[8deg] scale-[1.2] lg:scale-110 origin-center"
		>
			@for (column of columns(); track $index; let odd = $odd) {
				<div
					class="flex flex-col gap-3 sm:gap-4 w-20 sm:w-28 lg:w-32 shrink-0 motion-safe:animate-[posterScroll_60s_linear_infinite]"
					[style.animation-direction]="odd ? 'reverse' : 'normal'"
					[style.animation-duration.s]="48 + $index * 9"
				>
					@for (poster of column; track $index) {
						<app-game-poster
							[src]="poster.src"
							[title]="poster.title"
							[width]="200"
							class="w-full shrink-0 aspect-[2/3] rounded-md ring-1 ring-white/10 shadow-xl shadow-black/60"
							titleSize="0.875rem"
						/>
					}
				</div>
			}
		</div>
		<div
			class="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/70 to-canvas/20"
		></div>
		<div
			class="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,transparent_0%,var(--color-canvas)_85%)] opacity-80"
		></div>

		<div
			class="relative h-full flex flex-col justify-end p-6 sm:p-10 lg:p-14"
		>
			<app-logo size="lg" class="mb-auto" />

			@if (featured(); as featured) {
				<div
					class="hidden lg:flex items-center gap-4 w-fit mb-10 p-3 pr-6 rounded-card bg-surface/80 backdrop-blur-md border border-line shadow-2xl shadow-black/60 motion-safe:animate-[uiFadeUp_700ms_cubic-bezier(0.16,1,0.3,1)_both]"
				>
					<app-game-poster
						[src]="featured.src"
						[title]="featured.title"
						[width]="200"
						class="w-14 aspect-[2/3] rounded ring-1 ring-white/10"
						[compact]="true"
					/>
					<div class="flex flex-col gap-1">
						<span
							class="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-brand"
							>Up next · #1</span
						>
						<span
							class="max-w-56 truncate font-display font-semibold text-fg"
							>{{ featured.title }}</span
						>
						<span class="text-xs text-fg-muted"
							>Score {{ featured.score }} · {{ featured.hours }}h
							to beat</span
						>
					</div>
					<div class="flex flex-col items-end ml-6 leading-none">
						<span
							class="text-[0.5625rem] uppercase tracking-[0.18em] text-fg-muted mb-1"
							>Ratio</span
						>
						<span
							class="font-display text-4xl font-bold text-brand tabular-nums"
							>{{ featured.ratio }}</span
						>
					</div>
				</div>
			}

			<h2
				class="m-0 font-display font-bold tracking-tight text-fg leading-[0.95] text-3xl sm:text-4xl lg:text-5xl xl:text-6xl"
			>
				Play what's<br />worth your time.
			</h2>
			<p
				class="hidden sm:block m-0 mt-3 lg:mt-4 max-w-md text-fg-secondary leading-relaxed"
			>
				Completr ranks your backlog by score per hour, so the next game
				you start is the one that pays off the most.
			</p>
			<ul
				class="hidden lg:flex list-none m-0 mt-8 p-0 flex-wrap gap-x-8 gap-y-3 text-sm text-fg-secondary"
			>
				<li class="flex items-center gap-2">
					<span
						aria-hidden="true"
						class="material-icons text-base text-brand"
						>speed</span
					>
					Ratio-ranked backlog
				</li>
				<li class="flex items-center gap-2">
					<span
						aria-hidden="true"
						class="material-icons text-base text-brand"
						>insights</span
					>
					Metacritic, OpenCritic & HLTB
				</li>
				<li class="flex items-center gap-2">
					<span
						aria-hidden="true"
						class="material-icons text-base text-brand"
						>groups</span
					>
					See what friends play
				</li>
			</ul>
		</div>
	`,
	host: { class: "relative block overflow-hidden isolate" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthShowcase {
	private readonly showcase = injectShowcaseGames();

	protected readonly columns = computed(() => {
		const games = this.showcase.hasValue()
			? this.showcase.value().data.games
			: [];
		if (games.length < POSTERS_PER_COLUMN)
			return distributeInColumns(FALLBACK_POSTERS);
		return distributeInColumns(
			games.map(game => ({ src: game.backgroundUrl, title: game.title }))
		);
	});

	protected readonly featured = computed(() => {
		if (this.showcase.isLoading()) return null;
		const featured = this.showcase.hasValue()
			? this.showcase.value().data.featured
			: null;
		if (!featured) return FALLBACK_FEATURED;
		return {
			src: featured.backgroundUrl,
			title: featured.title,
			score: featured.score,
			hours: featured.hours,
			ratio: featured.ratio
		};
	});
}
