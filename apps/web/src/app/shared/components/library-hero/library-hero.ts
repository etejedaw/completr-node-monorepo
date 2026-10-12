import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import { GamePoster } from "../game-poster/game-poster";

export interface LibraryHeroPoster {
	src: string | null | undefined;
	title: string;
}

const MOSAIC_LENGTH = 14;

@Component({
	selector: "app-library-hero",
	imports: [GamePoster],
	template: `
		<header
			class="bleed bleed-top relative isolate overflow-hidden mb-6 border-b border-line"
		>
			<div
				aria-hidden="true"
				class="absolute inset-0 -z-10 overflow-hidden"
			>
				<div
					class="absolute -inset-x-10 -top-16 flex gap-3 -rotate-6 scale-110 opacity-60"
				>
					@for (poster of mosaic(); track $index) {
						<app-game-poster
							[src]="poster.src"
							[title]="poster.title"
							[width]="200"
							class="w-28 sm:w-36 aspect-[2/3] shrink-0 rounded-md"
							[class.translate-y-10]="$odd"
						/>
					}
				</div>
				<div
					class="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/75 to-canvas/10"
				></div>
				<div
					class="absolute inset-0 bg-gradient-to-r from-canvas/90 via-canvas/30 to-transparent"
				></div>
			</div>

			<div
				class="bleed-inner pt-[calc(var(--topbar-height)+3rem)] sm:pt-[calc(var(--topbar-height)+4.5rem)] pb-0 flex flex-col gap-6"
			>
				<div
					class="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
				>
					<div class="min-w-0">
						<ng-content select="[heroEyebrow]" />
						<h1
							class="font-display m-0 mt-1 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-none"
						>
							{{ heading() }}
						</h1>
						<ng-content select="[heroSubtitle]" />
					</div>
					<div class="flex items-center gap-2 shrink-0">
						<ng-content select="[heroActions]" />
					</div>
				</div>
				<ng-content />
			</div>
		</header>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class LibraryHero {
	readonly heading = input.required<string>();
	readonly posters = input<LibraryHeroPoster[]>([]);

	protected readonly mosaic = computed(() => {
		const posters = this.posters();
		if (posters.length === 0) return [];
		return Array.from(
			{ length: MOSAIC_LENGTH },
			(_, i) => posters[i % posters.length]!
		);
	});
}
