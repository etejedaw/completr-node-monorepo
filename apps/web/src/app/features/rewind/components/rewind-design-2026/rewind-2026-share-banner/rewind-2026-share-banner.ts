import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import { type RewindStoryImage } from "../../../rewind-story-image.model";
import { Rewind2026StoryShareBanner } from "../rewind-2026-story-share-banner/rewind-2026-story-share-banner";
import { Rewind2026VisitorShareRow } from "../rewind-2026-visitor-share-row/rewind-2026-visitor-share-row";
import { type Rewind2026ShareBannerSource } from "./rewind-2026-share-banner.model";

@Component({
	selector: "app-rewind-2026-share-banner",
	imports: [Rewind2026StoryShareBanner, Rewind2026VisitorShareRow],
	templateUrl: "./rewind-2026-share-banner.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Rewind2026ShareBanner {
	readonly rewind = input.required<Rewind2026ShareBannerSource>();
	readonly image = input.required<RewindStoryImage>();
	readonly gamesImage = input<RewindStoryImage | null>(null);
	readonly previewAlt = input.required<string>();
	readonly isOwner = input(false);
	readonly username = input("");

	protected readonly year = computed(() => this.rewind().year);
	protected readonly language = computed(() => this.rewind().language);
}
