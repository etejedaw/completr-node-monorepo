import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import { InView } from "../../../../shared/directives/in-view";
import { UiButton, UiIconButton, UiSkeleton } from "../../../../shared/ui";
import { injectRewindShareActions } from "../../inject-rewind-share-actions";
import { REWIND_SHARE_COPY } from "../../rewind-share-copy";
import { type RewindStoryImage } from "../../rewind-story-image.model";

const SINGLE_PAGE_CLASS = "mx-auto w-[min(100%,14rem)] grid-cols-1";

@Component({
	selector: "app-rewind-share-actions",
	imports: [InView, UiButton, UiIconButton, UiSkeleton],
	templateUrl: "./rewind-share-actions.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindShareActions {
	readonly image = input.required<RewindStoryImage>();
	readonly gamesImage = input<RewindStoryImage | null>(null);
	readonly previewAlt = input.required<string>();

	protected readonly copy = REWIND_SHARE_COPY;

	private readonly actions = injectRewindShareActions({
		image: () => this.image(),
		gamesImage: () => this.gamesImage(),
		previewAlt: () => this.previewAlt()
	});

	protected readonly pages = this.actions.pages;
	protected readonly hasSeveralPages = this.actions.hasSeveralPages;
	protected readonly canShareFiles = this.actions.canShareFiles;
	protected readonly isReady = this.actions.isReady;
	protected readonly shareLabel = this.actions.shareLabel;
	protected readonly sharing = this.actions.sharing;
	protected readonly pendingDownloads = this.actions.pendingDownloads;
	protected readonly shareImages = this.actions.shareImages;
	protected readonly sharePage = this.actions.sharePage;
	protected readonly download = this.actions.download;
	protected readonly copyLink = this.actions.copyLink;
	protected readonly preload = this.actions.preload;
	protected readonly retryPreview = this.actions.retryPreview;

	protected readonly pagesClass = computed(() =>
		this.hasSeveralPages() ? "grid-cols-2" : SINGLE_PAGE_CLASS
	);
}
