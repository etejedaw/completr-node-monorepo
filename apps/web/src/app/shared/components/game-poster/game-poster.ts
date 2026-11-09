import {
	booleanAttribute,
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	linkedSignal
} from "@angular/core";

import { CoverUrlPipe } from "../../pipes/cover-url";

const coverUrl = new CoverUrlPipe();

function hueFromText(text: string): number {
	let hash = 0;
	for (let i = 0; i < text.length; i++) {
		hash = (hash * 31 + text.charCodeAt(i)) | 0;
	}
	return Math.abs(hash) % 360;
}

@Component({
	selector: "app-game-poster",
	template: `
		@if (displayedUrl(); as url) {
			<img
				[src]="url"
				(error)="onImageError($event)"
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
	host: {
		class: "block overflow-hidden bg-input-bg",
		"[class.ring-1]": "framed()",
		"[class.ring-line-hover]": "framed()"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GamePoster {
	readonly src = input<string | null | undefined>(null);
	readonly title = input.required<string>();
	readonly width = input<420 | 640>(420);
	readonly compact = input(false);
	readonly titleSize = input("0.8125rem");
	readonly framed = input(false, { transform: booleanAttribute });

	private readonly failedUrls = linkedSignal<
		string | null | undefined,
		readonly string[]
	>({
		source: this.src,
		computation: () => []
	});

	protected readonly displayedUrl = computed(() => {
		const original = this.src();
		if (!original) {
			return null;
		}
		const failed = this.failedUrls();
		const candidates = [
			coverUrl.transform(original, this.width()),
			original
		];
		return candidates.find(url => !failed.includes(url)) ?? null;
	});

	protected onImageError(event: Event): void {
		const failedUrl = (event.target as HTMLImageElement).getAttribute(
			"src"
		);
		if (failedUrl) {
			this.failedUrls.update(urls =>
				urls.includes(failedUrl) ? urls : [...urls, failedUrl]
			);
		}
	}

	protected readonly fallbackBackground = computed(() => {
		const hue = hueFromText(this.title());
		return `linear-gradient(160deg, hsl(${hue} 55% 34%) 0%, hsl(${(hue + 40) % 360} 60% 16%) 70%, hsl(${(hue + 60) % 360} 50% 9%) 100%)`;
	});
}
