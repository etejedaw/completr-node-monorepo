import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import { CoverUrlPipe } from "../../pipes/cover-url";

function hueFromText(text: string): number {
	let hash = 0;
	for (let i = 0; i < text.length; i++) {
		hash = (hash * 31 + text.charCodeAt(i)) | 0;
	}
	return Math.abs(hash) % 360;
}

@Component({
	selector: "app-game-poster",
	imports: [CoverUrlPipe],
	template: `
		@if (src()) {
			<img
				[src]="src() | coverUrl: width()"
				[alt]="title()"
				class="w-full h-full object-cover"
				loading="lazy"
			/>
		} @else {
			<div
				class="relative w-full h-full flex flex-col justify-end overflow-hidden"
				[style.background]="fallbackBackground()"
				role="img"
				[attr.aria-label]="title()"
			>
				<div
					aria-hidden="true"
					class="absolute inset-0 opacity-[0.18]"
					style="
						background-image: repeating-linear-gradient(
							135deg,
							rgba(255, 255, 255, 0.5) 0 1px,
							transparent 1px 9px
						);
					"
				></div>
				<span
					aria-hidden="true"
					class="material-icons absolute top-[12%] left-1/2 -translate-x-1/2 text-white/25"
					[style.font-size]="compact() ? '1.25rem' : '2.5rem'"
					>sports_esports</span
				>
				@if (!compact()) {
					<span
						aria-hidden="true"
						class="relative px-2 pb-2 font-display font-bold leading-[1.05] text-white/90 line-clamp-3 drop-shadow"
						[style.font-size]="titleSize()"
						>{{ title() }}</span
					>
				}
			</div>
		}
	`,
	host: { class: "block overflow-hidden bg-input-bg" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GamePoster {
	readonly src = input<string | null | undefined>(null);
	readonly title = input.required<string>();
	readonly width = input<200 | 420 | 640>(420);
	readonly compact = input(false);
	readonly titleSize = input("0.8125rem");

	protected readonly fallbackBackground = computed(() => {
		const hue = hueFromText(this.title());
		return `linear-gradient(160deg, hsl(${hue} 55% 34%) 0%, hsl(${(hue + 40) % 360} 60% 16%) 70%, hsl(${(hue + 60) % 360} 50% 9%) 100%)`;
	});
}
