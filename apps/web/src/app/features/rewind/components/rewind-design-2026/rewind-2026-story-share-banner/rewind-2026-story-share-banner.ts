import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import { InView } from "../../../../../shared/directives/in-view";
import { CoverUrlPipe } from "../../../../../shared/pipes/cover-url";
import { UiButton, UiEyebrow, UiSkeleton } from "../../../../../shared/ui";
import { gameArtUrl } from "../../../../../shared/utils/game-art";
import { injectRewindShareActions } from "../../../inject-rewind-share-actions";
import { rewindCopy } from "../../../rewind-copy";
import { RewindReveal } from "../../../rewind-reveal";
import { REWIND_SHARE_COPY } from "../../../rewind-share-copy";
import { type RewindStoryImage } from "../../../rewind-story-image.model";
import { selectRewind2026FanGames } from "../rewind-2026-cover-fan/rewind-2026-cover-fan";
import { type Rewind2026ShareBannerSource } from "../rewind-2026-share-banner/rewind-2026-share-banner.model";

export const REWIND_2026_COLLAGE_TILES = 24;

const SEVERAL_IMAGE_CLASSES = [
	"top-0 left-[4%] -rotate-[8deg]",
	"right-[4%] top-[1.4rem] rotate-[7deg]"
];
const SINGLE_IMAGE_CLASS = "top-0 left-1/2 -translate-x-1/2 -rotate-[4deg]";

export function rewind2026CollageUrls(
	source: Rewind2026ShareBannerSource,
	tiles = REWIND_2026_COLLAGE_TILES
): string[] {
	const distinct = selectRewind2026FanGames(source, tiles).flatMap(game => {
		const url = gameArtUrl(game, "portrait");
		return url ? [url] : [];
	});
	if (distinct.length === 0) return [];
	return Array.from(
		{ length: tiles },
		(_, index) => distinct[index % distinct.length]
	);
}

@Component({
	selector: "app-rewind-2026-story-share-banner",
	imports: [
		CoverUrlPipe,
		InView,
		RewindReveal,
		UiButton,
		UiEyebrow,
		UiSkeleton
	],
	templateUrl: "./rewind-2026-story-share-banner.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Rewind2026StoryShareBanner {
	readonly rewind = input.required<Rewind2026ShareBannerSource>();
	readonly image = input.required<RewindStoryImage>();
	readonly gamesImage = input<RewindStoryImage | null>(null);
	readonly previewAlt = input.required<string>();

	protected readonly actions = injectRewindShareActions({
		image: () => this.image(),
		gamesImage: () => this.gamesImage(),
		previewAlt: () => this.previewAlt()
	});

	protected readonly shareCopy = REWIND_SHARE_COPY;
	protected readonly text = computed(
		() => rewindCopy(this.rewind().language).page
	);
	protected readonly headline = computed(() =>
		this.text().shareHeadline(this.rewind().year)
	);
	protected readonly collage = computed(() =>
		rewind2026CollageUrls(this.rewind())
	);
	protected readonly hasPendingDownload = computed(
		() => this.actions.pendingDownloads().size > 0
	);
	protected readonly imageClasses = computed(() =>
		this.actions.hasSeveralPages()
			? SEVERAL_IMAGE_CLASSES
			: [SINGLE_IMAGE_CLASS]
	);
}
